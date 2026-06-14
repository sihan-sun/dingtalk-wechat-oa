import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PlatformStaffDTO } from '../platform.types';

/**
 * 企业微信开放平台 API 客户端
 *
 * 职责：
 * 1. 获取 access_token（带缓存）
 * 2. 通过 UserID 获取员工详情
 * 3. 将企业微信员工数据转换为 PlatformStaffDTO
 */
@Injectable()
export class WeComClient {
  private readonly logger = new Logger(WeComClient.name);
  private readonly http: AxiosInstance;
  private accessToken: string | null = null;
  private accessTokenExpireAt: number = 0;

  constructor() {
    this.http = axios.create({
      baseURL: 'https://qyapi.weixin.qq.com',
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

    const corpId = process.env.WECOM_CORP_ID;
    const secret = process.env.WECOM_SECRET;

    if (!corpId || !secret) {
      throw new Error('企业微信 CORP_ID / SECRET 未配置');
    }

    try {
      const res = await this.http.get('/cgi-bin/gettoken', {
        params: { corpid: corpId, corpsecret: secret },
      });

      if (res.data.errcode !== 0) {
        throw new Error(
          `企业微信 token 获取失败: ${res.data.errmsg} (errcode=${res.data.errcode})`,
        );
      }

      this.accessToken = res.data.access_token;
      // 有效期 7200 秒，提前 5 分钟刷新
      this.accessTokenExpireAt =
        now + (res.data.expires_in || 7200) * 1000 - 300000;

      this.logger.log('企业微信 access_token 已刷新');
      return this.accessToken!;
    } catch (error) {
      this.logger.error('获取企业微信 access_token 失败', error.message);
      throw error;
    }
  }

  /**
   * 通过 UserID 获取员工详情
   */
  async getUserDetail(userId: string): Promise<PlatformStaffDTO> {
    const token = await this.getAccessToken();

    try {
      const res = await this.http.get('/cgi-bin/user/get', {
        params: {
          access_token: token,
          userid: userId,
        },
      });

      if (res.data.errcode !== 0) {
        throw new Error(
          `企业微信获取员工失败: ${res.data.errmsg} (errcode=${res.data.errcode})`,
        );
      }

      return this.transformToDTO(res.data);
    } catch (error) {
      this.logger.error(
        `获取企业微信员工详情失败 userId=${userId}`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * 将企业微信用户数据转换为 PlatformStaffDTO
   */
  private transformToDTO(wecomUser: any): PlatformStaffDTO {
    // department 是 number[] 格式
    const departmentIds: string[] = (wecomUser.department || []).map(String);

    return {
      platformType: 'wecom',
      corpId: process.env.WECOM_CORP_ID || '',
      platformUserId: wecomUser.userid,
      platformUnionId: undefined, // 企业微信没有 unionId 概念
      name: wecomUser.name,
      mobile: wecomUser.mobile || undefined,
      email: wecomUser.email || undefined,
      jobNumber: wecomUser.position || undefined,
      avatar: wecomUser.avatar || undefined,
      departmentIds,
      departmentNames: [], // 需要额外调用部门接口获取名称
      position: wecomUser.position || undefined,
      status: this.mapStatus(wecomUser),
      joinTime: undefined, // 企业微信接口不直接返回入职时间
      rawData: wecomUser,
    };
  }

  /**
   * 映射企业微信员工状态
   *
   * 企业微信 enable 字段: 1=启用, 0=禁用
   * status 字段: 1=已激活, 2=已禁用, 4=未激活, 5=退出企业
   */
  private mapStatus(user: any): 'active' | 'inactive' | 'resigned' {
    if (user.status === 5 || user.enable === 0) {
      return 'resigned';
    }
    if (user.status === 2 || user.status === 4) {
      return 'inactive';
    }
    return 'active';
  }
}
