import { Controller, Get, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventLog, EventLogDocument } from '../../schemas/event-log.schema';

@Controller('api/event-logs')
export class EventLogController {
  constructor(
    @InjectModel(EventLog.name)
    private eventLogModel: Model<EventLogDocument>,
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
}
