import { registerAs } from '@nestjs/config';

export const platformConfig = registerAs('platform', () => ({
  dingtalk: {
    clientId: process.env.DINGTALK_CLIENT_ID || '',
    clientSecret: process.env.DINGTALK_CLIENT_SECRET || '',
  },
}));
