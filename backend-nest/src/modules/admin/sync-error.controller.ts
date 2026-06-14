import { Controller, Get, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SyncErrorLog,
  SyncErrorLogDocument,
} from '../../schemas/sync-error-log.schema';

@Controller('api/sync-errors')
export class SyncErrorController {
  constructor(
    @InjectModel(SyncErrorLog.name)
    private syncErrorLogModel: Model<SyncErrorLogDocument>,
  ) {}

  /**
   * GET /api/sync-errors
   * 分页列表，支持按平台/状态筛选
   */
  @Get()
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('platformType') platformType?: string,
    @Query('status') status?: string,
  ): Promise<any> {
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 20));
    const skip = (pageNum - 1) * size;

    const filter: any = {};
    if (platformType) filter.platformType = platformType;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      this.syncErrorLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(size)
        .lean()
        .exec(),
      this.syncErrorLogModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page: pageNum, pageSize: size };
  }
}
