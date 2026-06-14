import { Module } from '@nestjs/common';
import { SyncModule } from '../sync/sync.module';
import { WeComCallbackController } from './wecom-callback.controller';
import { WeComCallbackService } from './wecom-callback.service';

@Module({
  imports: [SyncModule],
  controllers: [WeComCallbackController],
  providers: [WeComCallbackService],
})
export class WeComCallbackModule {}
