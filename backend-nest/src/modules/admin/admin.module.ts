import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventLog, EventLogSchema } from '../../schemas/event-log.schema';
import {
  SyncErrorLog,
  SyncErrorLogSchema,
} from '../../schemas/sync-error-log.schema';
import { SyncTask, SyncTaskSchema } from '../../schemas/sync-task.schema';
import { SyncModule } from '../sync/sync.module';
import { EventLogController } from './event-log.controller';
import { SyncErrorController } from './sync-error.controller';
import { SyncTaskController } from './sync-task.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EventLog.name, schema: EventLogSchema },
      { name: SyncErrorLog.name, schema: SyncErrorLogSchema },
      { name: SyncTask.name, schema: SyncTaskSchema },
    ]),
    SyncModule,
  ],
  controllers: [
    EventLogController,
    SyncErrorController,
    SyncTaskController,
  ],
})
export class AdminModule {}
