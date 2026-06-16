import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Staff, StaffDocument } from '../../schemas/staff.schema';
import { StaffUnion, StaffUnionDocument } from '../../schemas/staff-union.schema';
import { EventLog, EventLogDocument } from '../../schemas/event-log.schema';
import {
  SyncErrorLog,
  SyncErrorLogDocument,
} from '../../schemas/sync-error-log.schema';
import { SyncTask, SyncTaskDocument, SyncType } from '../../schemas/sync-task.schema';
import { DingTalkClient } from '../platform/clients/dingtalk.client';
import { WeComClient } from '../platform/clients/wecom.client';
import { PlatformStaffDTO } from '../platform/platform.types';
import { sanitizeErrorMessage } from '../../common/utils/sanitize.util';

/**
 * 核心同步服务
 *
 * 统一处理入口 — 无论事件来自钉钉 Stream、企业微信 Callback 还是主动同步，
 * 最终都调用此服务的方法完成：
 *   幂等检查 → upsert staff → 匹配/创建 union → 绑定 → 刷新 union 状态
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectModel(Staff.name) private staffModel: Model<StaffDocument>,
    @InjectModel(StaffUnion.name)
    private staffUnionModel: Model<StaffUnionDocument>,
    @InjectModel(EventLog.name)
    private eventLogModel: Model<EventLogDocument>,
    @InjectModel(SyncErrorLog.name)
    private syncErrorLogModel: Model<SyncErrorLogDocument>,
    @InjectModel(SyncTask.name)
    private syncTaskModel: Model<SyncTaskDocument>,
    private readonly dingTalkClient: DingTalkClient,
    private readonly weComClient: WeComClient,
  ) {}

  // ============================================================
  // 事件处理入口
  // ============================================================

  /**
   * 处理钉钉 Stream 事件（统一入口）
   */
  async handleDingTalkEvent(event: any): Promise<void> {
    const headers = event.headers || {};
    const eventType = headers.eventType as string;
    const eventId = headers.eventId as string;
    const eventCorpId = headers.eventCorpId || 'unknown';
    let data: any = event.data;

    // event.data 可能是 JSON 字符串
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        this.logger.warn(`事件 data JSON 解析失败 eventId=${eventId}`);
        data = {};
      }
    }

    if (!eventId) {
      this.logger.warn('收到无 eventId 的事件，跳过');
      return;
    }

    // 幂等检查
    if (await this.isEventProcessed(eventId, 'dingtalk')) {
      this.logger.log(`事件已处理，跳过 eventId=${eventId}`);
      return;
    }

    // 创建 event_log
    const eventLog = await this.eventLogModel.create({
      platformType: 'dingtalk',
      eventSource: 'dingtalk_stream',
      corpId: eventCorpId,
      eventType,
      eventId,
      platformUserId: data.userId || data.userid || undefined,
      rawPayload: event,
      handleStatus: 'pending',
      receivedAt: new Date(Number(headers.eventBornTime) || Date.now()),
    });

    try {
      await this.processEvent(eventType, eventCorpId, data, 'dingtalk');
      await this.eventLogModel.findByIdAndUpdate(eventLog._id, {
        handleStatus: 'success',
        handledAt: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `事件处理失败 eventId=${eventId} eventType=${eventType}`,
        error.stack,
      );
      await this.eventLogModel.findByIdAndUpdate(eventLog._id, {
        handleStatus: 'failed',
        errorMessage: sanitizeErrorMessage(error),
        handledAt: new Date(),
      });
      await this.syncErrorLogModel.create({
        eventLogId: eventLog._id,
        platformType: 'dingtalk',
        platformUserId: data.userId || data.userid || undefined,
        errorType: 'event_handle_failed',
        errorMessage: sanitizeErrorMessage(error),
        retryCount: 0,
        status: 'pending',
      });
    }
  }

  /**
   * 处理企业微信 Callback 事件
   */
  async handleWeComEvent(event: any): Promise<void> {
    const headers = event.headers || {};
    const eventType = headers.eventType as string;
    const eventId = headers.eventId as string;
    const eventCorpId =
      process.env.WECOM_CORP_ID || headers.eventCorpId || 'unknown';
    let data: any = event.data;

    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        data = {};
      }
    }

    if (!eventId) {
      this.logger.warn('收到无 eventId 的企业微信事件，跳过');
      return;
    }

    if (await this.isEventProcessed(eventId, 'wecom')) {
      this.logger.log(`企业微信事件已处理，跳过 eventId=${eventId}`);
      return;
    }

    const eventLog = await this.eventLogModel.create({
      platformType: 'wecom',
      eventSource: 'wecom_callback',
      corpId: eventCorpId,
      eventType,
      eventId,
      platformUserId: data.UserID || data.userId || undefined,
      rawPayload: event,
      handleStatus: 'pending',
      receivedAt: new Date(),
    });

    try {
      await this.processEvent(eventType, eventCorpId, data, 'wecom');
      await this.eventLogModel.findByIdAndUpdate(eventLog._id, {
        handleStatus: 'success',
        handledAt: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `企业微信事件处理失败 eventId=${eventId} eventType=${eventType}`,
        error.stack,
      );
      await this.eventLogModel.findByIdAndUpdate(eventLog._id, {
        handleStatus: 'failed',
        errorMessage: sanitizeErrorMessage(error),
        handledAt: new Date(),
      });
      await this.syncErrorLogModel.create({
        eventLogId: eventLog._id,
        platformType: 'wecom',
        platformUserId: data.UserID || data.userId || undefined,
        errorType: 'event_handle_failed',
        errorMessage: sanitizeErrorMessage(error),
        retryCount: 0,
        status: 'pending',
      });
    }
  }

  // ============================================================
  // 统一事件分发
  // ============================================================

  /**
   * 统一事件处理分发
   * 合并了原来分散的 DingTalk/WeCom 事件处理逻辑
   */
  private async processEvent(
    eventType: string,
    corpId: string,
    data: any,
    platformType: string,
  ): Promise<void> {
    const userId =
      platformType === 'wecom'
        ? data.UserID || data.userId
        : data.userId || data.userid;

    if (!userId) {
      this.logger.warn(`${eventType} 事件缺少 userId`);
      return;
    }

    switch (eventType) {
      // 钉钉事件
      case 'user_add_org':
      case 'user_modify_org':
      case 'user_active_org':
        await this.handleUserUpdate(corpId, data, platformType);
        break;
      case 'user_leave_org':
        await this.handleUserLeave(corpId, data);
        break;

      // 企业微信事件
      case 'create_user':
      case 'update_user':
        await this.handleUserUpdate(corpId, data, platformType);
        break;
      case 'delete_user':
        await this.handleWeComUserLeave(data);
        break;

      default:
        this.logger.log(`未处理的事件类型: ${eventType}`);
    }
  }

  /**
   * 处理员工入职/修改（统一钉钉和企微）
   */
  private async handleUserUpdate(
    corpId: string,
    data: any,
    platformType: string,
  ): Promise<void> {
    const userId =
      platformType === 'wecom'
        ? data.UserID || data.userId
        : data.userId || data.userid;

    if (!userId) return;

    let staffDTO;
    const client =
      platformType === 'wecom' ? this.weComClient : this.dingTalkClient;

    try {
      if (platformType === 'wecom') {
        staffDTO = await this.weComClient.getUserDetail(userId);
      } else {
        staffDTO = await this.dingTalkClient.getUserDetail(userId, corpId);
      }
    } catch {
      this.logger.warn(
        `获取员工详情失败，使用事件数据降级处理 userId=${userId}`,
      );
      staffDTO = this.buildFallbackDTO(corpId, data, platformType);
    }

    const staff = await this.upsertStaff(staffDTO);

    if (!staff.unionId) {
      await this.matchAndBindUnion(staff);
    } else {
      await this.refreshUnion(staff.unionId.toString());
    }
  }

  /**
   * 处理钉钉员工离职
   */
  private async handleUserLeave(corpId: string, data: any) {
    const userId = data.userId || data.userid;
    if (!userId) return;

    const staff = await this.staffModel.findOneAndUpdate(
      {
        platformType: 'dingtalk',
        corpId,
        platformUserId: userId,
      },
      {
        $set: {
          status: 'resigned',
          isDeleted: true,
          resignTime: new Date(),
          lastEventAt: new Date(),
          rawData: data,
        },
      },
      { new: true },
    );

    if (!staff) {
      this.logger.warn(
        `未找到离职员工 staff, userId=${userId}, corpId=${corpId}`,
      );
      return;
    }

    if (staff.unionId) {
      await this.refreshUnion(staff.unionId.toString());
    }
  }

  /**
   * 处理企业微信员工离职
   */
  private async handleWeComUserLeave(data: any) {
    const userId = data.UserID || data.userId;
    if (!userId) return;

    const corpId = process.env.WECOM_CORP_ID || '';

    const staff = await this.staffModel.findOneAndUpdate(
      {
        platformType: 'wecom',
        corpId,
        platformUserId: userId,
      },
      {
        $set: {
          status: 'resigned',
          isDeleted: true,
          resignTime: new Date(),
          lastEventAt: new Date(),
          rawData: data,
        },
      },
      { new: true },
    );

    if (!staff) {
      this.logger.warn(
        `未找到企业微信离职员工 staff, userId=${userId}`,
      );
      return;
    }

    if (staff.unionId) {
      await this.refreshUnion(staff.unionId.toString());
    }
  }

  // ============================================================
  // 核心方法
  // ============================================================

  /**
   * 幂等检查：通过 eventId 判断事件是否已成功处理
   */
  private async isEventProcessed(
    eventId: string,
    platformType: string = 'dingtalk',
  ): Promise<boolean> {
    const existing = await this.eventLogModel.findOne({
      platformType,
      eventId,
      handleStatus: 'success',
    });
    return !!existing;
  }

  /**
   * upsert staff — 存在则更新，不存在则创建
   */
  async upsertStaff(dto: {
    platformType: string;
    corpId: string;
    platformUserId: string;
    platformUnionId?: string;
    name?: string;
    mobile?: string;
    email?: string;
    jobNumber?: string;
    avatar?: string;
    departmentIds?: string[];
    departmentNames?: string[];
    position?: string;
    status?: string;
    joinTime?: Date;
    resignTime?: Date;
    rawData?: Record<string, any>;
  }): Promise<StaffDocument> {
    const updateData = {
      platformType: dto.platformType,
      corpId: dto.corpId,
      platformUserId: dto.platformUserId,
      platformUnionId: dto.platformUnionId,
      name: dto.name,
      mobile: dto.mobile,
      email: dto.email,
      jobNumber: dto.jobNumber,
      avatar: dto.avatar,
      departmentIds: dto.departmentIds || [],
      departmentNames: dto.departmentNames || [],
      position: dto.position,
      status: dto.status || 'active',
      isDeleted: dto.status === 'deleted' || dto.status === 'resigned',
      joinTime: dto.joinTime,
      resignTime: dto.resignTime,
      rawData: dto.rawData,
      lastSyncAt: new Date(),
    };

    return this.staffModel.findOneAndUpdate(
      {
        platformType: dto.platformType,
        corpId: dto.corpId,
        platformUserId: dto.platformUserId,
      },
      { $set: updateData },
      { new: true, upsert: true },
    );
  }

  /**
   * 按规则匹配已有 staff_union，匹配到则绑定，否则新建
   *
   * 匹配优先级：mobile → jobNumber → email
   * 使用 findOneAndUpdate 原子操作防止竞态
   */
  async matchAndBindUnion(staff: StaffDocument): Promise<StaffUnionDocument> {
    const matchResult = await this.findMatchedUnion(staff);

    if (matchResult) {
      await this.staffModel.findByIdAndUpdate(staff._id, {
        unionId: matchResult.union._id,
      });
      await this.refreshUnion(matchResult.union._id.toString());
      return matchResult.union;
    }

    // 新建 union — 使用 findOneAndUpdate + upsert 原子操作防止竞态
    return this.createUnionFromStaff(staff);
  }

  /**
   * 根据 staff 信息匹配已有的 staff_union
   */
  private async findMatchedUnion(staff: StaffDocument): Promise<{
    union: StaffUnionDocument;
    matchRule: string;
    matchKey: string;
  } | null> {
    if (staff.mobile) {
      const union = await this.staffUnionModel.findOne({
        mobile: staff.mobile,
      });
      if (union) {
        return { union, matchRule: 'mobile', matchKey: staff.mobile };
      }
    }

    if (staff.jobNumber) {
      const union = await this.staffUnionModel.findOne({
        jobNumber: staff.jobNumber,
      });
      if (union) {
        return { union, matchRule: 'jobNumber', matchKey: staff.jobNumber };
      }
    }

    if (staff.email) {
      const union = await this.staffUnionModel.findOne({
        email: staff.email,
      });
      if (union) {
        return { union, matchRule: 'email', matchKey: staff.email };
      }
    }

    return null;
  }

  /**
   * 以 staff 信息创建新的 staff_union，并将 staff 绑定上去
   * 使用唯一索引 + 捕获重复键来处理竞态条件
   */
  async createUnionFromStaff(
    staff: StaffDocument,
    matchRule = 'self',
  ): Promise<StaffUnionDocument> {
    const createData: Record<string, any> = {
      name: staff.name,
      email: staff.email,
      jobNumber: staff.jobNumber,
      avatar: staff.avatar,
      status: staff.status === 'active' ? 'active' : 'resigned',
      matchKey: staff.mobile || staff.jobNumber || staff.email || '',
      matchRule,
      conflictStatus: 'none',
    };

    // 只有当字段有值时才包含（避免空字符串触发稀疏唯一索引）
    if (staff.mobile) createData.mobile = staff.mobile;

    try {
      const union = await this.staffUnionModel.create(createData);

      await this.staffModel.findByIdAndUpdate(staff._id, {
        unionId: union._id,
      });

      return union;
    } catch (error: any) {
      // 如果因为唯一索引冲突失败，说明并发创建了，重新查找
      if (error.code === 11000) {
        this.logger.warn(
          `union 创建冲突，重试匹配 userId=${staff.platformUserId}`,
        );
        const matchResult = await this.findMatchedUnion(staff);
        if (matchResult) {
          await this.staffModel.findByIdAndUpdate(staff._id, {
            unionId: matchResult.union._id,
          });
          return matchResult.union;
        }
      }
      throw error;
    }
  }

  /**
   * 刷新 staff_union 状态
   *
   * union 不存 staffIds，通过 staff.unionId 查询关联 staff
   * 状态规则：任意一个 staff active → union active
   */
  async refreshUnion(unionId: string): Promise<void> {
    const staffs = await this.staffModel.find({
      unionId: new Types.ObjectId(unionId),
    });

    if (staffs.length === 0) {
      this.logger.warn(`刷新 union 时未找到关联 staff, unionId=${unionId}`);
      return;
    }

    const activeStaffs = staffs.filter((s) => s.status === 'active');
    const selectedStaff = activeStaffs[0] || staffs[0];
    const status = activeStaffs.length > 0 ? 'active' : 'resigned';

    await this.staffUnionModel.findByIdAndUpdate(unionId, {
      name: selectedStaff.name,
      mobile: selectedStaff.mobile,
      email: selectedStaff.email,
      jobNumber: selectedStaff.jobNumber,
      avatar: selectedStaff.avatar,
      status,
    });
  }

  /**
   * 统一构建降级 DTO（合并原来的 buildFallbackDTO 和 buildWeComFallbackDTO）
   */
  private buildFallbackDTO(
    corpId: string,
    data: any,
    platformType: string,
  ) {
    const isWeCom = platformType === 'wecom';

    return {
      platformType: isWeCom ? ('wecom' as const) : ('dingtalk' as const),
      corpId: isWeCom
        ? process.env.WECOM_CORP_ID || ''
        : corpId,
      platformUserId: isWeCom
        ? data.UserID || data.userId || ''
        : data.userId || data.userid || '',
      name: isWeCom ? data.Name || data.name : data.name || data.userName,
      mobile: data.mobile || data.Mobile || undefined,
      email: isWeCom
        ? data.Email || data.email
        : data.email || data.orgEmail,
      jobNumber: data.jobNumber || data.Position || data.position || undefined,
      departmentIds: isWeCom
        ? data.Department
          ? String(data.Department).split(',').map((s: string) => s.trim())
          : []
        : data.deptIdList?.map(String) || [],
      departmentNames: [],
      position: data.title || data.Position || data.position || undefined,
      status: 'active' as const,
      rawData: data,
    };
  }

  // ============================================================
  // 全量同步（供 SyncController 和 TaskService 共用）
  // ============================================================

  async syncFull(platformType: 'dingtalk' | 'wecom'): Promise<{
    success: boolean;
    taskId?: any;
    total?: number;
    successCount?: number;
    failCount?: number;
    error?: string;
  }> {
    const client = platformType === 'wecom' ? this.weComClient : this.dingTalkClient;
    const corpId = platformType === 'wecom'
      ? process.env.WECOM_CORP_ID || ''
      : process.env.DINGTALK_CLIENT_ID || '';

    const task = await this.syncTaskModel.create({
      platformType,
      syncType: SyncType.FULL,
      status: 'running',
      startTime: new Date(),
    });

    try {
      let users: PlatformStaffDTO[] = [];
      try {
        if (platformType === 'wecom') {
          const depts = await this.weComClient.getDepartmentList();
          if (depts.length === 0) {
            users = await this.weComClient.getDepartmentUsers(1);
          } else {
            const userIdSet = new Set<string>();
            for (const d of depts) {
              try {
                const members = await this.weComClient.getDepartmentUsers(d.id);
                for (const m of members) {
                  if (!userIdSet.has(m.platformUserId)) {
                    userIdSet.add(m.platformUserId);
                    users.push(m);
                  }
                }
              } catch { /* skip empty */ }
            }
          }
        } else {
          const deptIds = await this.dingTalkClient.getDepartmentIds();
          const userIdSet = new Set<string>();
          for (const deptId of deptIds) {
            const members = await this.dingTalkClient.getDepartmentUsers(deptId);
            for (const m of members) {
              if (!userIdSet.has(m.platformUserId)) {
                userIdSet.add(m.platformUserId);
                users.push(m);
              }
            }
          }
        }
      } catch (error) {
        this.logger.warn(`${platformType} 部门获取失败: ${error.message}`);
      }

      let successCount = 0;
      let failCount = 0;
      for (const dto of users) {
        try {
          const staff = await this.upsertStaff(dto);
          if (!staff.unionId) {
            await this.matchAndBindUnion(staff);
          } else {
            await this.refreshUnion(staff.unionId.toString());
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
        errorMessage: sanitizeErrorMessage(error),
        endTime: new Date(),
      });
      return { success: false, taskId: task._id, error: error.message };
    }
  }
}
