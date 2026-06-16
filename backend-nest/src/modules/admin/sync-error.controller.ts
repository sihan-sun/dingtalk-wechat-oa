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
import {
  SyncErrorLog,
  SyncErrorLogDocument,
} from '../../schemas/sync-error-log.schema';
import { SyncService } from '../sync/sync.service';

@Controller('api/sync-errors')
export class SyncErrorController {
  private readonly logger = new Logger(SyncErrorController.name);

  constructor(
    @InjectModel(SyncErrorLog.name)
    private syncErrorLogModel: Model<SyncErrorLogDocument>,
    private readonly syncService: SyncService,
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

  /**
   * GET /api/sync-errors/:id
   * 错误详情
   */
  @Get(':id')
  async detail(@Param('id') id: string): Promise<any> {
    const errorLog = await this.syncErrorLogModel.findById(id).lean().exec();
    return errorLog || null;
  }

  /**
   * POST /api/sync-errors/:id/retry
   * 重试失败的同步
   */
  @Post(':id/retry')
  async retry(@Param('id') id: string) {
    const errorLog = await this.syncErrorLogModel.findById(id);
    if (!errorLog) {
      throw new BadRequestException('错误记录不存在');
    }

    if (errorLog.status !== 'pending') {
      throw new BadRequestException('仅待处理的错误可重试');
    }

    // 增加重试计数
    await this.syncErrorLogModel.findByIdAndUpdate(id, {
      $inc: { retryCount: 1 },
      $set: { status: 'pending', nextRetryAt: undefined },
    });

    // 如果有关联的事件日志，重试事件
    if (errorLog.eventLogId) {
      this.logger.log(`重试错误 ${id}，关联事件 ${errorLog.eventLogId}`);
      // 重试通过 /api/event-logs/:id/retry 接口处理
      return {
        success: true,
        message: '重试已触发，请通过事件日志接口重试关联事件',
        errorLogId: id,
        eventLogId: errorLog.eventLogId,
      };
    }

    // 简单标记为 pending 等待下次 Cron 处理
    return {
      success: true,
      message: '错误已重新入队，等待下次自动重试',
      errorLogId: id,
      retryCount: errorLog.retryCount + 1,
    };
  }
}
