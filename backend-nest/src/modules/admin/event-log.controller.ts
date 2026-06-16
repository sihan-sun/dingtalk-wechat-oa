import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventLog, EventLogDocument } from '../../schemas/event-log.schema';
import { SyncService } from '../sync/sync.service';

@Controller('api/event-logs')
export class EventLogController {
  private readonly logger = new Logger(EventLogController.name);

  constructor(
    @InjectModel(EventLog.name)
    private eventLogModel: Model<EventLogDocument>,
    private readonly syncService: SyncService,
  ) {}

  /**
   * GET /api/event-logs
   * 分页列表，支持按平台/事件类型/处理状态筛选
   */
  @Get()
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('platformType') platformType?: string,
    @Query('eventType') eventType?: string,
    @Query('eventSource') eventSource?: string,
    @Query('handleStatus') handleStatus?: string,
  ): Promise<any> {
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 20));
    const skip = (pageNum - 1) * size;

    const filter: any = {};
    if (platformType) filter.platformType = platformType;
    if (eventType) filter.eventType = eventType;
    if (eventSource) filter.eventSource = eventSource;
    if (handleStatus) filter.handleStatus = handleStatus;

    const [items, total] = await Promise.all([
      this.eventLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(size)
        .lean()
        .exec(),
      this.eventLogModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page: pageNum, pageSize: size };
  }

  /**
   * GET /api/event-logs/:id
   * 事件详情
   */
  @Get(':id')
  async detail(@Param('id') id: string): Promise<any> {
    const eventLog = await this.eventLogModel.findById(id).lean().exec();
    return eventLog || null;
  }

  /**
   * POST /api/event-logs/:id/retry
   * 重试失败的事件
   */
  @Post(':id/retry')
  async retry(@Param('id') id: string) {
    const eventLog = await this.eventLogModel.findById(id);
    if (!eventLog) {
      throw new BadRequestException('事件记录不存在');
    }

    if (eventLog.handleStatus !== 'failed') {
      throw new BadRequestException('仅失败的事件可重试');
    }

    // 根据平台类型重新分发事件
    const rawPayload = eventLog.rawPayload as any;

    if (eventLog.platformType === 'dingtalk') {
      await this.syncService.handleDingTalkEvent(rawPayload);
    } else {
      await this.syncService.handleWeComEvent(rawPayload);
    }

    return {
      success: true,
      message: '事件已重新处理',
      eventId: eventLog.eventId,
    };
  }
}
