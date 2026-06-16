import { Module } from '@nestjs/common';
import { DingTalkClient } from './clients/dingtalk.client';
import { WeComClient } from './clients/wecom.client';
import { PlatformService } from './platform.service';

@Module({
  providers: [DingTalkClient, WeComClient, PlatformService],
  exports: [DingTalkClient, WeComClient, PlatformService],
})
export class PlatformModule {}
