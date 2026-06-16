import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // 全局校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  // 全局异常过滤器（生产环境不暴露堆栈）
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS：生产环境限制来源，开发环境允许全部
  if (isProduction) {
    const allowedOrigin = process.env.CORS_ORIGIN;
    if (allowedOrigin) {
      app.enableCors({ origin: allowedOrigin, credentials: true });
    } else {
      app.enableCors({ origin: false }); // 仅允许同源
    }
  } else {
    app.enableCors(); // 开发环境允许所有来源
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[StaffSync] 服务已启动，端口: ${port}, 环境: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
