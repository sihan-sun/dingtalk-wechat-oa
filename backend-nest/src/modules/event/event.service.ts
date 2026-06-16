import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventLog, EventLogDocument } from '../../schemas/event-log.schema';
import { SyncService } from '../sync/sync.service';

/**
 * 统一事件处理服务
 *
 * 钉钉 Stream 事件和企业微信 Callback 事件都进入此服务。
 * 职责：保存事件日志 → 幂等检查 → 分发到 SyncService
 */
@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly syncService: SyncService,
    @InjectModel(EventLog.name)
    private eventLogModel: Model<EventLogDocument>,
  ) {}

  async handlePlatformEvent(event: {
    platformType: string;
    eventSource: string;
    rawPayload: any;
  }) {
    if (event.platformType === 'dingtalk') {
      await this.syncService.handleDingTalkEvent(event.rawPayload);
    } else {
      await this.syncService.handleWeComEvent(event.rawPayload);
    }
  }

  async isEventProcessed(eventId: string, platformType: string): Promise<boolean> {
    const existing = await this.eventLogModel.findOne({
      platformType,
      eventId,
      handleStatus: 'success',
    });
    return !!existing;
  }
}
