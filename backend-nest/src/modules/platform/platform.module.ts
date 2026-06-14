import { Module } from '@nestjs/common';
import { DingTalkClient } from './clients/dingtalk.client';

@Module({
  providers: [DingTalkClient],
  exports: [DingTalkClient],
})
export class PlatformModule {}
