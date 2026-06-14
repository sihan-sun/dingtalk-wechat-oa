import { Injectable, Logger } from '@nestjs/common';
import { SyncService } from '../sync/sync.service';
import {
  verifySignature,
  decryptMessage,
  encryptMessage,
  parseWeComXml,
} from './wecom-crypto.util';

/**
 * 企业微信回调服务
 *
 * 职责：
 * 1. URL 验证（GET 请求）：校验签名 + 解密 echostr
 * 2. 事件接收（POST 请求）：校验签名 + 解密 XML → 解析事件 → 分发到 SyncService
 */
@Injectable()
export class WeComCallbackService {
  private readonly logger = new Logger(WeComCallbackService.name);
  private readonly token: string;
  private readonly encodingAesKey: string;
  private readonly corpId: string;

  // 事件计数器，用于生成唯一 eventId
  private eventCounter = 0;

  constructor(private readonly syncService: SyncService) {
    this.token = process.env.WECOM_CALLBACK_TOKEN || '';
    this.encodingAesKey = process.env.WECOM_ENCODING_AES_KEY || '';
    this.corpId = process.env.WECOM_CORP_ID || '';
  }

  /**
   * URL 验证（企业微信后台配置回调 URL 时触发）
   *
   * 企业微信 GET 请求带参数：
   *   ?msg_signature=xxx&timestamp=xxx&nonce=xxx&echostr=xxx
   *
   * 验证签名 → 解密 echostr → 返回明文
   */
  verifyUrl(
    msgSignature: string,
    timestamp: string,
    nonce: string,
    echostr: string,
  ): string {
    if (!this.token || !this.encodingAesKey) {
      this.logger.warn('企业微信回调配置未设置，URL 验证失败');
      throw new Error('企业微信回调配置未设置');
    }

    // 1. 校验签名
    if (!verifySignature(this.token, timestamp, nonce, echostr, msgSignature)) {
      this.logger.error('企业微信 URL 验证签名失败');
      throw new Error('签名校验失败');
    }

    // 2. 解密 echostr
    const { message } = decryptMessage(echostr, this.encodingAesKey);

    this.logger.log('企业微信 URL 验证成功');
    return message;
  }

  /**
   * 接收企业微信推送的事件（POST 请求）
   *
   * 企业微信 POST 请求带 URL 参数：
   *   ?msg_signature=xxx&timestamp=xxx&nonce=xxx
   *
   * Body 为加密 XML：
   *   <xml>
   *     <ToUserName><![CDATA[...]]></ToUserName>
   *     <Encrypt><![CDATA[...]]></Encrypt>
   *     <AgentID><![CDATA[...]]></AgentID>
   *   </xml>
   *
   * 返回 "success" 明文给企业微信（不能是 XML 或 JSON）
   */
  async handleCallback(
    msgSignature: string,
    timestamp: string,
    nonce: string,
    body: string,
  ): Promise<string> {
    if (!this.token || !this.encodingAesKey) {
      this.logger.warn('企业微信回调配置未设置，事件处理跳过');
      return 'success';
    }

    try {
      // 1. 解析 XML → 提取 Encrypt
      const parsed = parseWeComXml(body);
      const encrypt = parsed.Encrypt;

      if (!encrypt) {
        this.logger.error('企业微信回调 XML 中未找到 Encrypt 字段');
        return 'success';
      }

      // 2. 校验签名
      if (!verifySignature(this.token, timestamp, nonce, encrypt, msgSignature)) {
        this.logger.error('企业微信回调签名校验失败');
        return 'success';
      }

      // 3. 解密消息
      const { message: decryptedXml } = decryptMessage(
        encrypt,
        this.encodingAesKey,
      );

      // 4. 解析明文 XML → 提取事件信息
      const eventData = parseWeComXml(decryptedXml);

      const changeType = eventData.ChangeType; // create_user / update_user / delete_user
      const userId = eventData.UserID;

      if (!changeType) {
        this.logger.warn('企业微信事件缺少 ChangeType，跳过');
        return 'success';
      }

      // 5. 生成唯一 eventId
      this.eventCounter += 1;
      const eventId = `wecom-${Date.now()}-${this.eventCounter}`;

      this.logger.log(
        `收到企业微信事件: type=${changeType}, userId=${userId}, eventId=${eventId}`,
      );

      // 6. 构造事件对象（与钉钉事件格式一致）
      const event = {
        headers: {
          eventType: changeType,
          eventId,
          eventCorpId: this.corpId,
        },
        data: eventData, // 传递原始解析后的 JSON
      };

      // 7. 分发到 SyncService 异步处理
      // 注意：企业微信要求 5 秒内响应，因此 fire-and-forget
      this.syncService.handleWeComEvent(event).catch((error) => {
        this.logger.error(
          `企业微信事件异步处理异常 type=${changeType} userId=${userId}`,
          error.stack,
        );
      });

      return 'success';
    } catch (error) {
      this.logger.error('企业微信回调处理异常', error.stack);
      return 'success'; // 始终返回 success，避免企业微信重复推送
    }
  }

  /**
   * 加密回复消息（暂不使用，预留）
   */
  encryptReply(content: string): string {
    const xml = `<xml><MsgType>text</MsgType><Content>${content}</Content></xml>`;
    return encryptMessage(xml, this.corpId, this.encodingAesKey);
  }
}
