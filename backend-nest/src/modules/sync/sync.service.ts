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
import { DingTalkClient } from '../platform/clients/dingtalk.client';

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
    private readonly dingTalkClient: DingTalkClient,
  ) {}

  // ============================================================
  // 事件处理入口
  // ============================================================

  /**
   * 处理钉钉 Stream 事件（统一入口）
   *
   * @param event 钉钉 Stream 事件对象
   *   - event.headers.eventType  事件类型
   *   - event.headers.eventId    事件唯一 ID
   *   - event.headers.eventBornTime 事件发生时间
   *   - event.headers.eventCorpId   企业 ID
   *   - event.data               事件数据（可能是 JSON 字符串）
   */
  async handleDingTalkEvent(event: any): Promise<void> {
    const headers = event.headers || {};
    const eventType = headers.eventType as string;
    const eventId = headers.eventId as string;
    const eventCorpId = headers.eventCorpId || 'unknown';
    let data: any = event.data;

    // event.data 可能是 JSON 字符串，需要解析
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

    // 幂等检查：已处理过的事件直接返回
    if (await this.isEventProcessed(eventId)) {
      this.logger.log(`事件已处理，跳过 eventId=${eventId}`);
      return;
    }

    // 创建 event_log 记录（状态 pending）
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
      switch (eventType) {
        case 'user_add_org':
          await this.handleUserAdd(eventCorpId, data);
          break;
        case 'user_modify_org':
          await this.handleUserModify(eventCorpId, data);
          break;
        case 'user_leave_org':
          await this.handleUserLeave(eventCorpId, data);
          break;
        case 'user_active_org':
          // 激活：等同于新增同步
          await this.handleUserAdd(eventCorpId, data);
          break;
        default:
          this.logger.log(`未处理的事件类型: ${eventType}`);
      }

      // 标记事件处理成功
      await this.eventLogModel.findByIdAndUpdate(eventLog._id, {
        handleStatus: 'success',
        handledAt: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `事件处理失败 eventId=${eventId} eventType=${eventType}`,
        error.stack,
      );

      // 标记事件处理失败
      await this.eventLogModel.findByIdAndUpdate(eventLog._id, {
        handleStatus: 'failed',
        errorMessage: error.message,
        handledAt: new Date(),
      });

      // 记录错误日志
      await this.syncErrorLogModel.create({
        eventLogId: eventLog._id,
        platformType: 'dingtalk',
        platformUserId: data.userId || data.userid || undefined,
        errorType: 'event_handle_failed',
        errorMessage: error.message,
        retryCount: 0,
        status: 'pending',
      });

      // 不抛出异常 — Stream 连接不应因单个事件失败而中断
    }
  }

  // ============================================================
  // 事件类型处理
  // ============================================================

  /**
   * 处理员工入职 (user_add_org)
   *
   * 流程：
   * 1. 通过钉钉 API 获取员工详情
   * 2. upsert staff
   * 3. 匹配或创建 staff_union
   * 4. 刷新 union 状态
   */
  private async handleUserAdd(corpId: string, data: any) {
    const userId = data.userId || data.userid;
    if (!userId) {
      this.logger.warn('user_add_org 事件缺少 userId');
      return;
    }

    let staffDTO;
    try {
      staffDTO = await this.dingTalkClient.getUserDetail(userId, corpId);
    } catch (error) {
      // API 调用失败时，用事件 data 作为降级数据
      this.logger.warn(
        `获取员工详情失败，使用事件数据降级处理 userId=${userId}`,
      );
      staffDTO = this.buildFallbackDTO(corpId, data);
    }

    const staff = await this.upsertStaff(staffDTO);

    // 如果 staff 还没有 unionId，按规则匹配或创建
    if (!staff.unionId) {
      await this.matchAndBindUnion(staff);
    } else {
      // 已有 union，刷新其状态
      await this.refreshUnion(staff.unionId.toString());
    }
  }

  /**
   * 处理员工信息修改 (user_modify_org)
   */
  private async handleUserModify(corpId: string, data: any) {
    const userId = data.userId || data.userid;
    if (!userId) {
      this.logger.warn('user_modify_org 事件缺少 userId');
      return;
    }

    let staffDTO;
    try {
      staffDTO = await this.dingTalkClient.getUserDetail(userId, corpId);
    } catch {
      this.logger.warn(
        `获取员工详情失败，使用事件数据降级处理 userId=${userId}`,
      );
      staffDTO = this.buildFallbackDTO(corpId, data);
    }

    const staff = await this.upsertStaff(staffDTO);

    if (staff.unionId) {
      await this.refreshUnion(staff.unionId.toString());
    } else {
      await this.matchAndBindUnion(staff);
    }
  }

  /**
   * 处理员工离职 (user_leave_org)
   *
   * 离职员工不物理删除，仅修改状态为 resigned
   */
  private async handleUserLeave(corpId: string, data: any) {
    const userId = data.userId || data.userid;
    if (!userId) {
      this.logger.warn('user_leave_org 事件缺少 userId');
      return;
    }

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
      this.logger.warn(`未找到离职员工 staff, userId=${userId}, corpId=${corpId}`);
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
  private async isEventProcessed(eventId: string): Promise<boolean> {
    const existing = await this.eventLogModel.findOne({
      platformType: 'dingtalk',
      eventId,
      handleStatus: 'success',
    });
    return !!existing;
  }

  /**
   * upsert staff — 存在则更新，不存在则创建
   *
   * 使用 platformType + corpId + platformUserId 唯一索引保证幂等
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
   */
  async matchAndBindUnion(staff: StaffDocument): Promise<StaffUnionDocument> {
    const matchResult = await this.findMatchedUnion(staff);

    if (matchResult) {
      // 匹配到已有 union，绑定
      await this.staffModel.findByIdAndUpdate(staff._id, {
        unionId: matchResult.union._id,
      });
      await this.refreshUnion(matchResult.union._id.toString());
      return matchResult.union;
    }

    // 没有匹配到，新建 union
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
    // 优先级 1: 手机号
    if (staff.mobile) {
      const union = await this.staffUnionModel.findOne({
        mobile: staff.mobile,
      });
      if (union) {
        return { union, matchRule: 'mobile', matchKey: staff.mobile };
      }
    }

    // 优先级 2: 工号
    if (staff.jobNumber) {
      const union = await this.staffUnionModel.findOne({
        jobNumber: staff.jobNumber,
      });
      if (union) {
        return { union, matchRule: 'jobNumber', matchKey: staff.jobNumber };
      }
    }

    // 优先级 3: 邮箱
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
   */
  async createUnionFromStaff(
    staff: StaffDocument,
    matchRule = 'self',
  ): Promise<StaffUnionDocument> {
    const union = await this.staffUnionModel.create({
      name: staff.name,
      mobile: staff.mobile,
      email: staff.email,
      jobNumber: staff.jobNumber,
      avatar: staff.avatar,
      status: staff.status === 'active' ? 'active' : 'resigned',
      matchKey: staff.mobile || staff.jobNumber || staff.email || '',
      matchRule,
      conflictStatus: 'none',
    });

    await this.staffModel.findByIdAndUpdate(staff._id, {
      unionId: union._id,
    });

    return union;
  }

  /**
   * 刷新 staff_union 状态
   *
   * union 不存 staffIds，通过 staff.unionId 查询关联 staff
   * 状态规则：任意一个 staff active → union active
   */
  async refreshUnion(unionId: string): Promise<void> {
    // 显式转换为 ObjectId；Mongoose find() 对字符串参数不会自动转换
    const staffs = await this.staffModel.find({
      unionId: new Types.ObjectId(unionId),
    });

    if (staffs.length === 0) {
      this.logger.warn(`刷新 union 时未找到关联 staff, unionId=${unionId}`);
      return;
    }

    const activeStaffs = staffs.filter((s) => s.status === 'active');
    // 优先取 active 的 staff 作为信息源，否则取第一个
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
   * 当 API 调用失败时，用事件数据的降级数据构建 DTO
   */
  private buildFallbackDTO(corpId: string, data: any) {
    return {
      platformType: 'dingtalk' as const,
      corpId,
      platformUserId: data.userId || data.userid || '',
      name: data.name || data.userName,
      mobile: data.mobile,
      email: data.email || data.orgEmail,
      jobNumber: data.jobNumber,
      departmentIds: data.deptIdList?.map(String) || [],
      departmentNames: [],
      position: data.title,
      status: 'active' as const,
      rawData: data,
    };
  }
}
