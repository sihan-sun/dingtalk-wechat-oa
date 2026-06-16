import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Staff, StaffDocument } from '../../schemas/staff.schema';
import { SyncService } from '../sync/sync.service';

/**
 * 定时任务服务 — 每天凌晨补偿同步 + 两阶段离职检测
 */
@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly syncService: SyncService,
    @InjectModel(Staff.name) private staffModel: Model<StaffDocument>,
  ) {}

  @Cron('7 2 * * *')
  async syncDingTalkEveryDay() {
    this.logger.log('[Cron] 钉钉全量同步');
    const result = await this.syncService.syncFull('dingtalk');
    this.logger.log(`[Cron] 钉钉同步完成: ${JSON.stringify(result)}`);
  }

  @Cron('7 3 * * *')
  async syncWeComEveryDay() {
    this.logger.log('[Cron] 企微全量同步');
    const result = await this.syncService.syncFull('wecom');
    this.logger.log(`[Cron] 企微同步完成: ${JSON.stringify(result)}`);
  }
}
