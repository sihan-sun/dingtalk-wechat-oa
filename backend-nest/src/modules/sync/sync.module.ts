import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Staff, StaffSchema } from '../../schemas/staff.schema';
import { StaffUnion, StaffUnionSchema } from '../../schemas/staff-union.schema';
import { EventLog, EventLogSchema } from '../../schemas/event-log.schema';
import {
  SyncErrorLog,
  SyncErrorLogSchema,
} from '../../schemas/sync-error-log.schema';
import { PlatformModule } from '../platform/platform.module';
import { SyncService } from './sync.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Staff.name, schema: StaffSchema },
      { name: StaffUnion.name, schema: StaffUnionSchema },
      { name: EventLog.name, schema: EventLogSchema },
      { name: SyncErrorLog.name, schema: SyncErrorLogSchema },
    ]),
    PlatformModule,
  ],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
