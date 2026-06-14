import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { WeComCallbackService } from './wecom-callback.service';

/**
 * 企业微信回调接口
 *
 * GET  /api/events/wecom/callback — URL 验证
 * POST /api/events/wecom/callback — 接收通讯录变更事件
 *
 * 注意：POST 需要接收原始 XML 文本（非 JSON），
 * 使用 rawBody 获取未解析的请求体。
 */
@Controller('api/events/wecom')
export class WeComCallbackController {
  constructor(private readonly callbackService: WeComCallbackService) {}

  /**
   * URL 验证（企业微信后台配置回调 URL 时触发）
   */
  @Get('callback')
  verifyUrl(
    @Query('msg_signature') msgSignature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Query('echostr') echostr: string,
  ): string {
    return this.callbackService.verifyUrl(
      msgSignature,
      timestamp,
      nonce,
      echostr,
    );
  }

  /**
   * 接收企业微信推送的事件
   *
   * 企业微信推送的是 XML（Content-Type: text/xml 或 application/xml），
   * Body 是原始 XML 字符串，需要 rawBody 来获取。
   *
   * 响应必须是纯文本 "success"，不能是 JSON 或 XML。
   */
  @Post('callback')
  async receiveEvent(
    @Query('msg_signature') msgSignature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<string> {
    // 企业微信推送的是 XML 文本，优先使用 rawBody
    const rawBody =
      typeof req.rawBody === 'string'
        ? req.rawBody
        : typeof body === 'string'
          ? body
          : JSON.stringify(body);

    return this.callbackService.handleCallback(
      msgSignature,
      timestamp,
      nonce,
      rawBody,
    );
  }
}
