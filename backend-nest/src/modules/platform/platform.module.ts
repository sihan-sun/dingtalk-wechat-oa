import { Module } from '@nestjs/common';
import { DingTalkClient } from './clients/dingtalk.client';
import { WeComClient } from './clients/wecom.client';

@Module({
  providers: [DingTalkClient, WeComClient],
  exports: [DingTalkClient, WeComClient],
})
export class PlatformModule {}
