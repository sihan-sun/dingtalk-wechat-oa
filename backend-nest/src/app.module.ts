import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { databaseConfig } from './config/database.config';
import { platformConfig } from './config/platform.config';
import { HealthController } from './health.controller';
import { PlatformModule } from './modules/platform/platform.module';
import { DingTalkStreamModule } from './modules/dingtalk-stream/dingtalk-stream.module';
import { WeComCallbackModule } from './modules/wecom-callback/wecom-callback.module';
import { EventModule } from './modules/event/event.module';
import { SyncModule } from './modules/sync/sync.module';
import { StaffModule } from './modules/staff/staff.module';
import { StaffUnionModule } from './modules/staff-union/staff-union.module';
import { TaskModule } from './modules/task/task.module';
import { DevMockModule } from './modules/dev-mock/dev-mock.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, platformConfig],
    }),
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27018/staff-sync',
    ),
    ScheduleModule.forRoot(),
    PlatformModule,
    DingTalkStreamModule,
    WeComCallbackModule,
    EventModule,
    SyncModule,
    StaffModule,
    StaffUnionModule,
    TaskModule,
    DevMockModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
