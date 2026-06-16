import {
  Body,
  Controller,
  Logger,
  Post,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SyncTask, SyncTaskDocument, SyncType } from '../../schemas/sync-task.schema';
import { Staff, StaffDocument } from '../../schemas/staff.schema';
import { SyncService } from '../sync/sync.service';
import { DingTalkClient } from '../platform/clients/dingtalk.client';
import { WeComClient } from '../platform/clients/wecom.client';
import { PlatformStaffDTO } from '../platform/platform.types';

@Controller('api/sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(
    private readonly syncService: SyncService,
    private readonly dingTalkClient: DingTalkClient,
    private readonly weComClient: WeComClient,
    @InjectModel(SyncTask.name) private syncTaskModel: Model<SyncTaskDocument>,
    @InjectModel(Staff.name) private staffModel: Model<StaffDocument>,
  ) {}

  /**
   * POST /api/sync/dingtalk/full
   * 钉钉全量同步
   */
  @Post('dingtalk/full')
  async syncDingTalkFull() {
    const task = await this.syncTaskModel.create({
      platformType: 'dingtalk',
      syncType: SyncType.FULL,
      status: 'running',
      startTime: new Date(),
    });

    try {
      let users: PlatformStaffDTO[] = [];

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
        this.logger.warn(`钉钉部门列表/成员获取失败: ${error.message}`);
        const existingStaffs = await this.staffModel
          .find({ platformType: 'dingtalk' })
          .exec();
        for (const staff of existingStaffs) {
          try {
            const dto = await this.dingTalkClient.getUserDetail(
              staff.platformUserId,
              staff.corpId,
            );
            users.push(dto);
          } catch {
            // 跳过
          }
        }
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
        } catch (error) {
          failCount++;
          this.logger.error(
            `全量同步失败 userId=${dto.platformUserId}`,
            error.stack,
          );
        }
      }

      await this.syncTaskModel.findByIdAndUpdate(task._id, {
        status: failCount === 0 ? 'success' : 'partial_success',
        totalCount: users.length,
        successCount,
        failCount,
        endTime: new Date(),
      });

      return {
        success: true,
        taskId: task._id,
        total: users.length,
        successCount,
        failCount,
      };
    } catch (error) {
      await this.syncTaskModel.findByIdAndUpdate(task._id, {
        status: 'failed',
        errorMessage: error.message,
        endTime: new Date(),
      });

      return { success: false, taskId: task._id, error: error.message };
    }
  }

  /**
   * POST /api/sync/wecom/full
   * 企业微信全量同步
   */
  @Post('wecom/full')
  async syncWeComFull() {
    const task = await this.syncTaskModel.create({
      platformType: 'wecom',
      syncType: SyncType.FULL,
      status: 'running',
      startTime: new Date(),
    });

    try {
      let users: PlatformStaffDTO[] = [];

      try {
        const departments = await this.weComClient.getDepartmentList();
        if (departments.length === 0) {
          users = await this.weComClient.getDepartmentUsers(1);
        } else {
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
            } catch {
              // 跳过空部门
            }
          }
        }
      } catch (error) {
        this.logger.warn(`企业微信部门获取失败: ${error.message}`);
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
        } catch (error) {
          failCount++;
          this.logger.error(
            `全量同步失败 userId=${dto.platformUserId}`,
            error.stack,
          );
        }
      }

      await this.syncTaskModel.findByIdAndUpdate(task._id, {
        status: failCount === 0 ? 'success' : 'partial_success',
        totalCount: users.length,
        successCount,
        failCount,
        endTime: new Date(),
      });

      return {
        success: true,
        taskId: task._id,
        total: users.length,
        successCount,
        failCount,
      };
    } catch (error) {
      await this.syncTaskModel.findByIdAndUpdate(task._id, {
        status: 'failed',
        errorMessage: error.message,
        endTime: new Date(),
      });

      return { success: false, taskId: task._id, error: error.message };
    }
  }

  /**
   * POST /api/sync/staff/one
   * 单员工同步
   */
  @Post('staff/one')
  async syncOne(
    @Body()
    body: {
      platformType?: string;
      corpId?: string;
      platformUserId: string;
    },
  ) {
    const platformType = body.platformType || 'dingtalk';
    const corpId =
      body.corpId ||
      (platformType === 'wecom'
        ? process.env.WECOM_CORP_ID || ''
        : 'unknown');

    if (!body.platformUserId) {
      return { success: false, message: 'platformUserId 为必填项' };
    }

    const task = await this.syncTaskModel.create({
      platformType,
      syncType: SyncType.SINGLE,
      status: 'running',
      startTime: new Date(),
    });

    try {
      let dto: PlatformStaffDTO;

      if (platformType === 'wecom') {
        dto = await this.weComClient.getUserDetail(body.platformUserId);
      } else {
        dto = await this.dingTalkClient.getUserDetail(
          body.platformUserId,
          corpId,
        );
      }

      const staff = await this.syncService.upsertStaff(dto);

      if (!staff.unionId) {
        await this.syncService.matchAndBindUnion(staff);
      } else {
        await this.syncService.refreshUnion(staff.unionId.toString());
      }

      await this.syncTaskModel.findByIdAndUpdate(task._id, {
        status: 'success',
        totalCount: 1,
        successCount: 1,
        endTime: new Date(),
      });

      return {
        success: true,
        taskId: task._id,
        staffId: staff._id,
        message: '单员工同步完成',
      };
    } catch (error) {
      await this.syncTaskModel.findByIdAndUpdate(task._id, {
        status: 'failed',
        errorMessage: error.message,
        endTime: new Date(),
      });

      return { success: false, taskId: task._id, error: error.message };
    }
  }
}
