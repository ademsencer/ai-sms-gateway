import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '@infrastructure/redis';
import { RATE_LIMIT } from '@shared/constants';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const path = request.url;

    const isSmsRoute = path.includes('/sms');
    const limit = isSmsRoute ? RATE_LIMIT.SMS_INGEST_LIMIT : RATE_LIMIT.DEFAULT_LIMIT;
    const ttl = isSmsRoute ? RATE_LIMIT.SMS_INGEST_TTL : RATE_LIMIT.DEFAULT_TTL;

    const key = `ratelimit:${ip}:${path}`;
    const result = await this.redisService.checkRateLimit(key, limit, ttl);

    const response = context.switchToHttp().getResponse();
    response.header('X-RateLimit-Limit', String(limit));
    response.header('X-RateLimit-Remaining', String(result.remaining));
    response.header('X-RateLimit-Reset', String(result.resetAt));

    if (!result.allowed) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
