import { Module } from '@nestjs/common';
import { SyncModule } from '../sync/sync.module';
import { DingTalkStreamService } from './dingtalk-stream.service';

@Module({
  imports: [SyncModule],
  providers: [DingTalkStreamService],
})
export class DingTalkStreamModule {}
