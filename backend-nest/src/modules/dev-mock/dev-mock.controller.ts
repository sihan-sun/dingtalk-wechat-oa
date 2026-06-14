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
 * 请求体：模拟平台事件（支持钉钉和企业微信）
 *
 * 钉钉示例:
 *   { "eventSource": "dingtalk_stream", "eventType": "user_add_org", "userId": "emp-001", "mobile": "13800001111" }
 *
 * 企业微信示例:
 *   { "eventSource": "wecom_callback", "eventType": "create_user", "userId": "wc-001", "mobile": "13800002222" }
 *
 * eventSource 默认 "dingtalk_stream"。
 */
export interface MockPlatformEventDto {
  /** 事件来源：dingtalk_stream | wecom_callback，默认 dingtalk_stream */
  eventSource?: string;
  /** 事件类型 */
  eventType: string;
  /** 企业 ID */
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
 * 支持两种平台：
 *   - dingtalk_stream：模拟钉钉 Stream 事件，调用 handleDingTalkEvent
 *   - wecom_callback：模拟企业微信 Callback 事件，调用 handleWeComEvent
 *
 * 路径：POST /api/dev/mock-dingtalk-event
 * 注意：仅在 NODE_ENV !== 'production' 时启用
 */
@Controller('api/dev')
@UseGuards(DevMockGuard)
export class DevMockController {
  private readonly logger = new Logger(DevMockController.name);
  private eventCounter = 0;

  constructor(private readonly syncService: SyncService) {}

  @Post('mock-dingtalk-event')
  async mockPlatformEvent(@Body() dto: MockPlatformEventDto) {
    const eventSource = dto.eventSource || 'dingtalk_stream';
    const corpId = dto.corpId || (eventSource === 'wecom_callback' ? 'mock-wecom-corp' : 'mock-dingtalk-corp');
    const now = Date.now();

    this.eventCounter += 1;
    const prefix = eventSource === 'wecom_callback' ? 'wecom-mock' : 'mock';
    const eventId = `${prefix}-${now}-${this.eventCounter}`;

    if (eventSource === 'wecom_callback') {
      return this.mockWeComEvent(dto, corpId, eventId, now);
    }

    return this.mockDingTalkEvent(dto, corpId, eventId, now);
  }

  /**
   * 模拟钉钉 Stream 事件
   */
  private async mockDingTalkEvent(
    dto: MockPlatformEventDto,
    corpId: string,
    eventId: string,
    now: number,
  ) {
    const eventData = {
      userId: dto.userId,
      name: dto.name || `模拟员工_${dto.userId}`,
      mobile: dto.mobile,
      email: dto.email,
      jobNumber: dto.jobNumber,
      deptIdList: dto.departmentIds,
      title: dto.position,
    };

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
      `[钉钉模拟] type=${dto.eventType}, userId=${dto.userId}, eventId=${eventId}`,
    );

    await this.syncService.handleDingTalkEvent(streamEvent);

    return {
      success: true,
      eventId,
      eventSource: 'dingtalk_stream',
      eventType: dto.eventType,
      message: '事件已处理',
    };
  }

  /**
   * 模拟企业微信 Callback 事件
   *
   * 企业微信 XML 解密后的数据字段名与钉钉不同，
   * 这里直接构造解密后的 JSON 格式传给 handleWeComEvent。
   */
  private async mockWeComEvent(
    dto: MockPlatformEventDto,
    corpId: string,
    eventId: string,
    now: number,
  ) {
    // 企业微信事件数据字段（模拟 XML 解密后的 JSON）
    const eventData = {
      UserID: dto.userId,
      Name: dto.name || `模拟员工_${dto.userId}`,
      Mobile: dto.mobile || '',
      Email: dto.email || '',
      Position: dto.position || '',
      Department: dto.departmentIds?.join(',') || '',
    };

    const event = {
      headers: {
        eventType: dto.eventType,
        eventId,
        eventBornTime: now,
        eventCorpId: corpId,
      },
      data: eventData,
    };

    this.logger.log(
      `[企微模拟] type=${dto.eventType}, userId=${dto.userId}, eventId=${eventId}`,
    );

    await this.syncService.handleWeComEvent(event);

    return {
      success: true,
      eventId,
      eventSource: 'wecom_callback',
      eventType: dto.eventType,
      message: '事件已处理',
    };
  }
}
