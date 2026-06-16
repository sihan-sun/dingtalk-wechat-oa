import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventLog, EventLogSchema } from '../../schemas/event-log.schema';
import { SyncModule } from '../sync/sync.module';
import { EventService } from './event.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EventLog.name, schema: EventLogSchema },
    ]),
    SyncModule,
  ],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
