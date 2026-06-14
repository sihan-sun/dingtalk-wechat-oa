import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * 开发环境守卫
 *
 * 仅当 NODE_ENV !== 'production' 时放行请求。
 * 生产环境下返回 403，确保模拟接口不会暴露到线上。
 */
@Injectable()
export class DevMockGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const nodeEnv = process.env.NODE_ENV || 'development';

    if (nodeEnv === 'production') {
      throw new ForbiddenException(
        '模拟接口仅限开发环境使用。请设置 NODE_ENV=development',
      );
    }

    return true;
  }
}
