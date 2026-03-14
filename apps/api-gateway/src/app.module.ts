import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import {
  appConfig,
  databaseConfig,
  redisConfig,
  rabbitmqConfig,
  telegramConfig,
  deviceConfig,
  jwtConfig,
} from '@infrastructure/config';
import { DatabaseModule } from '@infrastructure/database';
import { RedisModule } from '@infrastructure/redis';
import { RabbitmqModule } from '@infrastructure/rabbitmq';
import { SocketModule } from '@infrastructure/socket';

import { DeviceModule } from '@modules/device/device.module';
import { SmsModule } from '@modules/sms/sms.module';
import { HealthModule } from '@modules/health/health.module';
import { StatsModule } from '@modules/stats/stats.module';
import { AuthModule } from '@modules/auth/auth.module';

import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { RateLimitGuard } from '@shared/guards/rate-limit.guard';
import { GlobalExceptionFilter } from '@shared/filters';
import { LoggingInterceptor } from '@shared/interceptors';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, rabbitmqConfig, telegramConfig, deviceConfig, jwtConfig],
      envFilePath: ['../../.env', '.env', '.env.local'],
    }),
    DatabaseModule,
    RedisModule,
    RabbitmqModule,
    SocketModule,
    DeviceModule,
    SmsModule,
    HealthModule,
    StatsModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
