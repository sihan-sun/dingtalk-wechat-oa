import { Module } from '@nestjs/common';
import { SyncModule } from '../sync/sync.module';
import { DevMockController } from './dev-mock.controller';

/**
 * 开发环境模拟事件模块
 *
 * 提供 POST /api/dev/mock-dingtalk-event 接口，
 * 用于在无真实钉钉 Stream 连接的情况下测试事件处理流程。
 *
 * NODE_ENV=production 时接口返回 403。
 */
@Module({
  imports: [SyncModule],
  controllers: [DevMockController],
})
export class DevMockModule {}
