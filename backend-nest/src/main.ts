import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // 企业微信 Callback 需要接收原始 XML body
  });

  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[StaffSync] 服务已启动，端口: ${port}`);
}

bootstrap();
