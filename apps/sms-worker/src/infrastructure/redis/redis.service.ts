import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async publish(channel: string, message: Record<string, unknown>): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(message));
  }
}
