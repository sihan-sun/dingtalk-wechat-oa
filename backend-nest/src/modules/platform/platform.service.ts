import { Injectable } from '@nestjs/common';
import { DingTalkClient } from './clients/dingtalk.client';
import { WeComClient } from './clients/wecom.client';
import { PlatformStaffDTO } from './platform.types';

/**
 * 平台统一服务层
 *
 * 封装 DingTalkClient 和 WeComClient，提供统一接口。
 */
@Injectable()
export class PlatformService {
  constructor(
    private readonly dingTalkClient: DingTalkClient,
    private readonly weComClient: WeComClient,
  ) {}

  async getUserDetail(
    platformType: string,
    userId: string,
    corpId?: string,
  ): Promise<PlatformStaffDTO> {
    if (platformType === 'wecom') {
      return this.weComClient.getUserDetail(userId);
    }
    return this.dingTalkClient.getUserDetail(userId, corpId || '');
  }

  async getDepartments(platformType: string): Promise<any[]> {
    if (platformType === 'wecom') {
      return this.weComClient.getDepartmentList();
    }
    const deptIds = await this.dingTalkClient.getDepartmentIds();
    return deptIds.map((id) => ({ id }));
  }

  async getUsersByDepartment(
    platformType: string,
    deptId: string,
  ): Promise<PlatformStaffDTO[]> {
    if (platformType === 'wecom') {
      return this.weComClient.getDepartmentUsers(deptId);
    }
    return this.dingTalkClient.getDepartmentUsers(deptId);
  }
}
