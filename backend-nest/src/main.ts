import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // 企业微信 Callback 需要接收原始 XML body
  });

  // 全局校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[StaffSync] 服务已启动，端口: ${port}`);
}

bootstrap();
