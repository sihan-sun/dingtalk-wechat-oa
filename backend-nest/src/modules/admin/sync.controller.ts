import { Body, Controller, Post } from '@nestjs/common';
import { SyncService } from '../sync/sync.service';
import { DingTalkClient } from '../platform/clients/dingtalk.client';
import { WeComClient } from '../platform/clients/wecom.client';
import { PlatformStaffDTO } from '../platform/platform.types';

@Controller('api/sync')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly dingTalkClient: DingTalkClient,
    private readonly weComClient: WeComClient,
  ) {}

  @Post('dingtalk/full')
  async syncDingTalkFull() {
    return this.syncService.syncFull('dingtalk');
  }

  @Post('wecom/full')
  async syncWeComFull() {
    return this.syncService.syncFull('wecom');
  }

  @Post('staff/one')
  async syncOne(@Body() body: { platformType?: string; corpId?: string; platformUserId: string }) {
    const platformType = body.platformType || 'dingtalk';
    const corpId = body.corpId || (platformType === 'wecom' ? process.env.WECOM_CORP_ID || '' : 'unknown');

    if (!body.platformUserId) {
      return { success: false, message: 'platformUserId 为必填项' };
    }

    try {
      let dto: PlatformStaffDTO;
      if (platformType === 'wecom') {
        dto = await this.weComClient.getUserDetail(body.platformUserId);
      } else {
        dto = await this.dingTalkClient.getUserDetail(body.platformUserId, corpId);
      }

      const staff = await this.syncService.upsertStaff(dto);
      if (!staff.unionId) {
        await this.syncService.matchAndBindUnion(staff);
      } else {
        await this.syncService.refreshUnion(staff.unionId.toString());
      }

      return { success: true, staffId: staff._id, message: '单员工同步完成' };
    } catch (error) {
      return { success: false, error: '同步失败，请检查平台凭证配置' };
    }
  }
}
