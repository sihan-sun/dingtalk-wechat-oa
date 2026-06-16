import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PlatformStaffDTO } from '../platform.types';

/**
 * 钉钉开放平台 API 客户端
 *
 * 职责：
 * 1. 获取 access_token（带缓存）
 * 2. 通过 userId 获取员工详情
 * 3. 将钉钉员工数据转换为 PlatformStaffDTO
 *
 * 当前为最小实现，后续可扩展：
 * - 部门列表、部门员工列表（全量同步用）
 * - 员工是否存在检查（离职比对用）
 */
@Injectable()
export class DingTalkClient {
  private readonly logger = new Logger(DingTalkClient.name);
  private readonly http: AxiosInstance;
  private accessToken: string | null = null;
  private accessTokenExpireAt: number = 0;

  constructor() {
    this.http = axios.create({
      baseURL: 'https://api.dingtalk.com',
      timeout: 15000,
    });
  }

  /**
   * 获取 access_token，缓存到过期前 5 分钟
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpireAt) {
      return this.accessToken;
    }

    const appKey = process.env.DINGTALK_CLIENT_ID;
    const appSecret = process.env.DINGTALK_CLIENT_SECRET;

    if (!appKey || !appSecret) {
      throw new Error('钉钉 CLIENT_ID/CLIENT_SECRET 未配置');
    }

    try {
      const res = await this.http.post('/v1.0/oauth2/accessToken', {
        appKey,
        appSecret,
      });

      this.accessToken = res.data.accessToken;
      // 官方默认有效期 7200 秒，提前 5 分钟刷新
      this.accessTokenExpireAt = now + (res.data.expireIn || 7200) * 1000 - 300000;

      this.logger.log('钉钉 access_token 已刷新');
      return this.accessToken!;
    } catch (error) {
      this.logger.error('获取钉钉 access_token 失败', error.message);
      throw error;
    }
  }

  /**
   * 通过 userId 获取员工详情，并转换为平台统一格式
   */
  async getUserDetail(
    userId: string,
    corpId: string,
  ): Promise<PlatformStaffDTO> {
    const token = await this.getAccessToken();

    try {
      const res = await this.http.get(`/v1.0/contact/users/${userId}`, {
        headers: {
          'x-acs-dingtalk-access-token': token,
        },
      });

      return this.transformToDTO(res.data, corpId);
    } catch (error) {
      this.logger.error(`获取钉钉员工详情失败 userId=${userId}`, error.message);
      throw error;
    }
  }

  /**
   * 将钉钉用户数据转换为 PlatformStaffDTO
   */
  private transformToDTO(
    dingtalkUser: any,
    corpId: string,
  ): PlatformStaffDTO {
    const departmentIds: string[] =
      dingtalkUser.deptIdList?.map(String) || [];

    return {
      platformType: 'dingtalk',
      corpId,
      platformUserId: dingtalkUser.userId,
      platformUnionId: dingtalkUser.unionId,
      name: dingtalkUser.name,
      mobile: dingtalkUser.mobile || this.extractMobile(dingtalkUser),
      email: dingtalkUser.email || dingtalkUser.orgEmail,
      jobNumber: dingtalkUser.jobNumber,
      avatar: dingtalkUser.avatar,
      departmentIds,
      departmentNames: [], // 钉钉接口不直接返回部门名称，需要额外查询
      position: dingtalkUser.title,
      status: dingtalkUser.active !== false ? 'active' : 'resigned',
      joinTime: dingtalkUser.hiredDate
        ? new Date(dingtalkUser.hiredDate)
        : undefined,
      rawData: dingtalkUser,
    };
  }

  /**
   * 获取所有部门 ID 列表（顶层，parentId=1）
   */
  async getDepartmentIds(parentId = 1): Promise<string[]> {
    const token = await this.getAccessToken();

    try {
      const res = await this.http.post('/v1.0/contact/departments/list', {
        parentId,
      });

      const deptList: any[] = res.data?.result || res.data || [];
      return deptList.map((d: any) => String(d.deptId || d.dept_id));
    } catch (error) {
      this.logger.error('获取钉钉部门列表失败', error.message);
      return [];
    }
  }

  /**
   * 获取指定部门下的员工列表
   */
  async getDepartmentUsers(deptId: string): Promise<PlatformStaffDTO[]> {
    const token = await this.getAccessToken();
    const corpId = process.env.DINGTALK_CLIENT_ID || '';

    try {
      const res = await this.http.post('/v1.0/contact/users/list', {
        deptId: Number(deptId),
        maxResults: 100,
      });

      const userList: any[] = res.data?.result?.list || res.data?.list || [];
      return userList.map((u: any) => this.transformToDTO(u, corpId));
    } catch (error) {
      this.logger.error(
        `获取钉钉部门成员失败 deptId=${deptId}`,
        error.message,
      );
      return [];
    }
  }

  /**
   * 从钉钉数据中提取手机号（可能在不同字段中）
   */
  private extractMobile(user: any): string | undefined {
    // 钉钉接口中手机号可能在 mobile 或 ExtAttr 中
    return user.mobile || user.extattr?.mobile || undefined;
  }
}
