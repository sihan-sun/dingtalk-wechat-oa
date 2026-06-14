import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { databaseConfig } from './config/database.config';
import { platformConfig } from './config/platform.config';
import { PlatformModule } from './modules/platform/platform.module';
import { DingTalkStreamModule } from './modules/dingtalk-stream/dingtalk-stream.module';
import { SyncModule } from './modules/sync/sync.module';
import { DevMockModule } from './modules/dev-mock/dev-mock.module';
import { WeComCallbackModule } from './modules/wecom-callback/wecom-callback.module';

@Module({
  imports: [
    // 环境变量配置（全局可用）
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, platformConfig],
    }),
    // MongoDB 连接
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/staff-sync',
    ),
    // 定时任务（后续补偿同步用）
    ScheduleModule.forRoot(),
    // 业务模块
    PlatformModule,
    SyncModule,
    DingTalkStreamModule, // OnModuleInit 时自动连接钉钉 Stream
    DevMockModule, // 开发环境模拟事件接口（仅 NODE_ENV !== 'production'）
    WeComCallbackModule, // 企业微信 HTTP Callback 事件接收
  ],
})
export class AppModule {}
