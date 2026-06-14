import { Controller, Post } from '@nestjs/common';
import { SyncService } from '../sync/sync.service';

/**
 * 手动同步触发接口（当前为占位，后续实现全量同步逻辑）
 */
@Controller('api/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('dingtalk/full')
  async syncDingTalkFull() {
    return {
      success: true,
      message: '钉钉全量同步任务已触发（开发中）',
    };
  }

  @Post('wecom/full')
  async syncWeComFull() {
    return {
      success: true,
      message: '企业微信全量同步任务已触发（开发中）',
    };
  }
}
