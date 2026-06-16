import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Staff, StaffSchema } from '../../schemas/staff.schema';
import { SyncTask, SyncTaskSchema } from '../../schemas/sync-task.schema';
import { PlatformModule } from '../platform/platform.module';
import { SyncModule } from '../sync/sync.module';
import { TaskService } from './task.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Staff.name, schema: StaffSchema },
      { name: SyncTask.name, schema: SyncTaskSchema },
    ]),
    PlatformModule,
    SyncModule,
  ],
  providers: [TaskService],
})
export class TaskModule {}
