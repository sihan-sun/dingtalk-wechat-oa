import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SyncTask,
  SyncTaskDocument,
} from '../../schemas/sync-task.schema';

@Controller('api/sync-tasks')
export class SyncTaskController {
  constructor(
    @InjectModel(SyncTask.name)
    private syncTaskModel: Model<SyncTaskDocument>,
  ) {}

  /**
   * GET /api/sync-tasks
   * 分页列表，支持按类型/状态/平台筛选
   */
  @Get()
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('syncType') syncType?: string,
    @Query('status') status?: string,
    @Query('platformType') platformType?: string,
  ): Promise<any> {
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 20));
    const skip = (pageNum - 1) * size;

    const filter: any = {};
    if (syncType) filter.syncType = syncType;
    if (status) filter.status = status;
    if (platformType) filter.platformType = platformType;

    const [items, total] = await Promise.all([
      this.syncTaskModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(size)
        .lean()
        .exec(),
      this.syncTaskModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page: pageNum, pageSize: size };
  }

  /**
   * GET /api/sync-tasks/:id
   * 任务详情
   */
  @Get(':id')
  async detail(@Param('id') id: string): Promise<any> {
    const task = await this.syncTaskModel.findById(id).lean().exec();
    return task || null;
  }
}
