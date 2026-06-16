import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Staff, StaffSchema } from '../../schemas/staff.schema';
import { StaffUnion, StaffUnionSchema } from '../../schemas/staff-union.schema';
import { EventLog, EventLogSchema } from '../../schemas/event-log.schema';
import {
  SyncErrorLog,
  SyncErrorLogSchema,
} from '../../schemas/sync-error-log.schema';
import { SyncTask, SyncTaskSchema } from '../../schemas/sync-task.schema';
import { PlatformModule } from '../platform/platform.module';
import { SyncService } from './sync.service';
import { SyncController } from '../admin/sync.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Staff.name, schema: StaffSchema },
      { name: StaffUnion.name, schema: StaffUnionSchema },
      { name: EventLog.name, schema: EventLogSchema },
      { name: SyncErrorLog.name, schema: SyncErrorLogSchema },
      { name: SyncTask.name, schema: SyncTaskSchema },
    ]),
    PlatformModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
