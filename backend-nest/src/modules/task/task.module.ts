import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Staff, StaffSchema } from '../../schemas/staff.schema';
import { SyncModule } from '../sync/sync.module';
import { TaskService } from './task.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Staff.name, schema: StaffSchema }]),
    SyncModule,
  ],
  providers: [TaskService],
})
export class TaskModule {}
