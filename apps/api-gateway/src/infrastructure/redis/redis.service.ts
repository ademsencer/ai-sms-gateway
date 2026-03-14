import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redis.expire(key, ttlSeconds);
  }

  async setNX(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const current = await this.incr(key);
    if (current === 1) {
      await this.expire(key, windowSeconds);
    }
    const ttl = await this.redis.ttl(key);
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt: Date.now() + ttl * 1000,
    };
  }

  /** Set device heartbeat with TTL */
  async setHeartbeat(deviceId: string, ttlSeconds: number): Promise<void> {
    await this.set(`device:heartbeat:${deviceId}`, Date.now().toString(), ttlSeconds);
  }

  /** Check if device heartbeat exists */
  async hasHeartbeat(deviceId: string): Promise<boolean> {
    return this.exists(`device:heartbeat:${deviceId}`);
  }

  /** Check SMS deduplication — returns true if duplicate */
  async checkDedup(dedupKey: string, ttlSeconds: number): Promise<boolean> {
    const isNew = await this.setNX(`sms:dedup:${dedupKey}`, '1', ttlSeconds);
    return !isNew; // true = duplicate
  }

  /** Publish to Redis pub/sub channel */
  async publish(channel: string, message: Record<string, unknown>): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(message));
  }

  /** Scan for keys matching pattern */
  async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, results] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...results);
    } while (cursor !== '0');
    return keys;
  }
}
