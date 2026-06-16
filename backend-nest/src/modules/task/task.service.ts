import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Staff, StaffDocument } from '../../schemas/staff.schema';
import {
  SyncTask,
  SyncTaskDocument,
  SyncType,
} from '../../schemas/sync-task.schema';
import { DingTalkClient } from '../platform/clients/dingtalk.client';
import { WeComClient } from '../platform/clients/wecom.client';
import { SyncService } from '../sync/sync.service';

/**
 * 定时任务服务
 *
 * 职责：
 * 1. 定时执行钉钉全量同步（每天 02:07）
 * 2. 定时执行企业微信全量同步（每天 03:07）
 * 3. 定时重试失败同步
 * 4. 定时处理 inactive_pending 员工
 */
@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly syncService: SyncService,
    private readonly dingTalkClient: DingTalkClient,
    private readonly weComClient: WeComClient,
    @InjectModel(Staff.name) private staffModel: Model<StaffDocument>,
    @InjectModel(SyncTask.name)
    private syncTaskModel: Model<SyncTaskDocument>,
  ) {}

  @Cron('7 2 * * *')
  async syncDingTalkEveryDay() {
    this.logger.log('[Task] 开始钉钉全量同步');

    const task = await this.syncTaskModel.create({
      platformType: 'dingtalk',
      syncType: SyncType.FULL,
      status: 'running',
      startTime: new Date(),
    });

    try {
      let users: any[] = [];
      try {
        const deptIds = await this.dingTalkClient.getDepartmentIds();
        const userIdSet = new Set<string>();
        for (const deptId of deptIds) {
          const members = await this.dingTalkClient.getDepartmentUsers(deptId);
          for (const member of members) {
            if (!userIdSet.has(member.platformUserId)) {
              userIdSet.add(member.platformUserId);
              users.push(member);
            }
          }
        }
      } catch (error) {
        this.logger.warn(`钉钉获取部门失败: ${error.message}`);
      }

      if (users.length > 0) {
        const apiUserIds = users.map((u: any) => u.platformUserId);
        await this.detectMissingStaff('dingtalk', apiUserIds);
      }

      let successCount = 0;
      let failCount = 0;
      for (const dto of users) {
        try {
          const staff = await this.syncService.upsertStaff(dto);
          if (!staff.unionId) {
            await this.syncService.matchAndBindUnion(staff);
          } else {
            await this.syncService.refreshUnion(staff.unionId.toString());
          }
          successCount++;
        } catch {
          failCount++;
        }
      }

      await this.syncTaskModel.findByIdAndUpdate(task._id, {
        status: failCount === 0 ? 'success' : 'partial_success',
        totalCount: users.length,
        successCount,
        failCount,
        endTime: new Date(),
      });

      this.logger.log(`[Task] 钉钉同步完成 total=${users.length} ok=${successCount} fail=${failCount}`);
    } catch (error) {
      this.logger.error('[Task] 钉钉同步失败', error.stack);
      await this.syncTaskModel.findByIdAndUpdate(task._id, {
        status: 'failed',
        errorMessage: error.message,
        endTime: new Date(),
      });
    }
  }

  @Cron('7 3 * * *')
  async syncWeComEveryDay() {
    this.logger.log('[Task] 开始企业微信全量同步');

    const task = await this.syncTaskModel.create({
      platformType: 'wecom',
      syncType: SyncType.FULL,
      status: 'running',
      startTime: new Date(),
    });

    try {
      let users: any[] = [];
      try {
        const departments = await this.weComClient.getDepartmentList();
        const allDeptIds = departments.map((d: any) => d.id);
        const userIdSet = new Set<string>();
        for (const deptId of allDeptIds) {
          try {
            const members = await this.weComClient.getDepartmentUsers(deptId);
            for (const member of members) {
              if (!userIdSet.has(member.platformUserId)) {
                userIdSet.add(member.platformUserId);
                users.push(member);
              }
            }
          } catch { /* skip */ }
        }
      } catch (error) {
        this.logger.warn(`企业微信获取部门失败: ${error.message}`);
      }

      if (users.length > 0) {
        const apiUserIds = users.map((u: any) => u.platformUserId);
        await this.detectMissingStaff('wecom', apiUserIds);
      }

      let successCount = 0;
      let failCount = 0;
      for (const dto of users) {
        try {
          const staff = await this.syncService.upsertStaff(dto);
          if (!staff.unionId) {
            await this.syncService.matchAndBindUnion(staff);
          } else {
            await this.syncService.refreshUnion(staff.unionId.toString());
          }
          successCount++;
        } catch {
          failCount++;
        }
      }

      await this.syncTaskModel.findByIdAndUpdate(task._id, {
        status: failCount === 0 ? 'success' : 'partial_success',
        totalCount: users.length,
        successCount,
        failCount,
        endTime: new Date(),
      });

      this.logger.log(`[Task] 企微同步完成 total=${users.length} ok=${successCount} fail=${failCount}`);
    } catch (error) {
      this.logger.error('[Task] 企微同步失败', error.stack);
      await this.syncTaskModel.findByIdAndUpdate(task._id, {
        status: 'failed',
        errorMessage: error.message,
        endTime: new Date(),
      });
    }
  }

  private async detectMissingStaff(platformType: string, apiUserIds: string[]) {
    const activeStaffs = await this.staffModel.find({
      platformType,
      status: { $in: ['active', 'inactive', 'inactive_pending'] },
    });

    const missingStaffs = activeStaffs.filter(
      (s) => !apiUserIds.includes(s.platformUserId),
    );

    if (missingStaffs.length > 0) {
      const ids = missingStaffs.map((s) => s._id);

      await this.staffModel.updateMany(
        {
          _id: { $in: ids },
          status: 'inactive_pending',
          lastSyncAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        { $set: { status: 'resigned', isDeleted: true, resignTime: new Date() } },
      );

      await this.staffModel.updateMany(
        { _id: { $in: ids }, status: { $in: ['active', 'inactive'] } },
        { $set: { status: 'inactive_pending' } },
      );

      this.logger.log(`检测到 ${missingStaffs.length} 个 ${platformType} 缺失员工，已标记`);
    }
  }
}
