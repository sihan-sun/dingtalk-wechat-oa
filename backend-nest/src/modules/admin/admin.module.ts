import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Staff, StaffSchema } from '../../schemas/staff.schema';
import { StaffUnion, StaffUnionSchema } from '../../schemas/staff-union.schema';
import { EventLog, EventLogSchema } from '../../schemas/event-log.schema';
import {
  SyncErrorLog,
  SyncErrorLogSchema,
} from '../../schemas/sync-error-log.schema';
import { SyncModule } from '../sync/sync.module';
import { StaffUnionController } from './staff-union.controller';
import { StaffController } from './staff.controller';
import { EventLogController } from './event-log.controller';
import { SyncErrorController } from './sync-error.controller';
import { SyncController } from './sync.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Staff.name, schema: StaffSchema },
      { name: StaffUnion.name, schema: StaffUnionSchema },
      { name: EventLog.name, schema: EventLogSchema },
      { name: SyncErrorLog.name, schema: SyncErrorLogSchema },
    ]),
    SyncModule,
  ],
  controllers: [
    StaffUnionController,
    StaffController,
    EventLogController,
    SyncErrorController,
    SyncController,
  ],
})
export class AdminModule {}
