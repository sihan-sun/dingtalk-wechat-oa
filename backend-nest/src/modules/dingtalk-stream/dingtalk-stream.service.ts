import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  DWClient,
  DWClientDownStream,
  EventAck,
} from 'dingtalk-stream';
import { SyncService } from '../sync/sync.service';

/**
 * 钉钉 Stream 模式事件消费服务
 *
 * 在 NestJS 启动时（OnModuleInit）自动建立与钉钉 Stream 的长连接，
 * 监听员工入职、离职、修改、激活事件。
 *
 * 系统不提供钉钉 HTTP Callback 接口，全部通过 Stream 模式接收事件。
 *
 * SDK 文档：
 * - npm 包：dingtalk-stream
 * - 鉴权：DWClient({ clientId, clientSecret })，clientId 即 AppKey，clientSecret 即 AppSecret
 * - 注册：registerAllEventListener 接收钉钉后台已订阅的所有事件
 * - 确认：返回 { status: EventAck.SUCCESS, message: 'OK' }
 */
@Injectable()
export class DingTalkStreamService implements OnModuleInit {
  private readonly logger = new Logger(DingTalkStreamService.name);

  constructor(private readonly syncService: SyncService) {}

  /**
   * NestJS 生命周期钩子 — 模块初始化后自动执行
   */
  async onModuleInit() {
    await this.startStreamClient();
  }

  /**
   * 建立钉钉 Stream 连接并注册事件监听
   */
  private async startStreamClient() {
    const clientId = process.env.DINGTALK_CLIENT_ID;
    const clientSecret = process.env.DINGTALK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      this.logger.warn(
        '钉钉 CLIENT_ID 或 CLIENT_SECRET 未配置，Stream 连接跳过。' +
          '请在 .env 中配置 DINGTALK_CLIENT_ID 和 DINGTALK_CLIENT_SECRET。',
      );
      return;
    }

    const client = new DWClient({
      clientId,
      clientSecret,
    });

    // 注册全局事件监听 — 接收钉钉后台"事件与回调"中已订阅的所有事件
    client.registerAllEventListener((event: DWClientDownStream) =>
      this.onEventReceived(event),
    );

    try {
      await client.connect();
      this.logger.log('钉钉 Stream 连接已建立，开始监听事件');
    } catch (error) {
      this.logger.error('钉钉 Stream 连接失败', error.stack);
      // 连接失败不阻止 NestJS 启动，后续可加重试逻辑
    }
  }

  /**
   * 事件接收回调（同步返回 ACK，异步处理事件）
   *
   * SDK 的 registerAllEventListener 要求回调同步返回 EventAckData，
   * 因此这里 fire-and-forget 异步处理，不阻塞 ACK 返回。
   *
   * @param event DWClientDownStream 对象
   *   - event.headers.eventType    事件类型
   *   - event.headers.eventId      事件唯一 ID
   *   - event.headers.eventBornTime 事件发生时间戳
   *   - event.headers.eventCorpId  企业 ID
   *   - event.data                 事件业务数据（字符串）
   */
  private onEventReceived(
    event: DWClientDownStream,
  ): { status: EventAck; message: string } {
    const eventType = event.headers?.eventType as string;
    const eventId = event.headers?.eventId as string;

    this.logger.log(
      `收到钉钉事件: type=${eventType}, id=${eventId}`,
    );

    // 异步处理事件，不阻塞 ACK 返回
    // 错误在 SyncService 中已记录到 event_logs 和 sync_error_logs
    this.syncService
      .handleDingTalkEvent(event)
      .catch((error) => {
        this.logger.error(
          `事件处理异常 eventType=${eventType} eventId=${eventId}`,
          error.stack,
        );
      });

    // 始终返回 SUCCESS，避免钉钉因单个事件处理慢而超时重试
    return { status: EventAck.SUCCESS, message: 'OK' };
  }
}
