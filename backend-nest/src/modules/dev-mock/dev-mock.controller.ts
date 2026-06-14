import {
  Body,
  Controller,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { SyncService } from '../sync/sync.service';
import { DevMockGuard } from './dev-mock.guard';

/**
 * 请求体：模拟钉钉事件
 *
 * 只需提供 eventType 和 userId，其余字段为可选（用于模拟不同员工数据）。
 * corpId 非必填，默认使用 "mock-corp"。
 * Controller 内部将包装为 DWClientDownStream 格式，
 * 调用 SyncService.handleDingTalkEvent() 走完整事件处理管道。
 */
export interface MockDingTalkEventDto {
  /** 事件类型：user_add_org | user_modify_org | user_leave_org */
  eventType: string;
  /** 企业 ID，默认 "mock-corp" */
  corpId?: string;
  /** 平台员工 ID（必填） */
  userId: string;
  /** 姓名 */
  name?: string;
  /** 手机号 */
  mobile?: string;
  /** 邮箱 */
  email?: string;
  /** 工号 */
  jobNumber?: string;
  /** 部门 ID 列表 */
  departmentIds?: string[];
  /** 职位 */
  position?: string;
}

/**
 * 开发环境模拟事件接口
 *
 * 用途：在无真实钉钉后台的情况下，通过 HTTP 请求模拟
 * user_add_org / user_modify_org / user_leave_org 事件，
 * 验证事件接收 → event_logs → staff → staff_unions 的完整链路。
 *
 * 路径：POST /api/dev/mock-dingtalk-event
 * 注意：此接口不走钉钉 Stream，不叫 callback，仅在 NODE_ENV !== 'production' 时启用。
 */
@Controller('api/dev')
@UseGuards(DevMockGuard)
export class DevMockController {
  private readonly logger = new Logger(DevMockController.name);

  // 用于生成唯一 eventId 的计数器
  private eventCounter = 0;

  constructor(private readonly syncService: SyncService) {}

  @Post('mock-dingtalk-event')
  async mockDingTalkEvent(@Body() dto: MockDingTalkEventDto) {
    const corpId = dto.corpId || 'mock-corp';
    const now = Date.now();

    // 生成唯一 eventId：mock-{时间戳}-{递增序号}
    this.eventCounter += 1;
    const eventId = `mock-${now}-${this.eventCounter}`;

    // 构造 event.data（模拟钉钉 Stream 事件的业务数据）
    const eventData = {
      userId: dto.userId,
      name: dto.name || `模拟员工_${dto.userId}`,
      mobile: dto.mobile,
      email: dto.email,
      jobNumber: dto.jobNumber,
      deptIdList: dto.departmentIds,
      title: dto.position,
    };

    // 构造 DWClientDownStream 兼容结构
    // 与真实钉钉 Stream 推送的格式一致
    const streamEvent = {
      headers: {
        eventType: dto.eventType,
        eventId,
        eventBornTime: now,
        eventCorpId: corpId,
      },
      data: JSON.stringify(eventData),
    };

    this.logger.log(
      `模拟事件: type=${dto.eventType}, userId=${dto.userId}, eventId=${eventId}`,
    );

    await this.syncService.handleDingTalkEvent(streamEvent);

    return {
      success: true,
      eventId,
      eventType: dto.eventType,
      message: `事件已处理，可在 event_logs / staffs / staff_unions 中查看结果`,
    };
  }
}
