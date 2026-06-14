import { registerAs } from '@nestjs/config';

export const platformConfig = registerAs('platform', () => ({
  dingtalk: {
    clientId: process.env.DINGTALK_CLIENT_ID || '',
    clientSecret: process.env.DINGTALK_CLIENT_SECRET || '',
  },
  wecom: {
    corpId: process.env.WECOM_CORP_ID || '',
    secret: process.env.WECOM_SECRET || '',
    callbackToken: process.env.WECOM_CALLBACK_TOKEN || '',
    encodingAesKey: process.env.WECOM_ENCODING_AES_KEY || '',
  },
}));
