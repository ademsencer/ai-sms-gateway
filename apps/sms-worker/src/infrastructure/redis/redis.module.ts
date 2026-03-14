import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService): Redis => {
        const logger = new Logger('RedisModule');
        const client = new Redis({
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password'),
          keyPrefix: configService.get<string>('redis.keyPrefix', 'smsgw:'),
          retryStrategy: (times: number) => {
            if (times > 3) return null;
            return Math.min(times * 200, 2000);
          },
        });
        client.on('connect', () => logger.log('Redis connected'));
        client.on('error', (err: Error) => logger.error(`Redis error: ${err.message}`));
        return client;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
