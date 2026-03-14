import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { databaseConfig, redisConfig, rabbitmqConfig, deviceConfig } from './infrastructure/config/app.config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { RabbitmqModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { MonitorModule } from './modules/monitor/monitor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, rabbitmqConfig, deviceConfig],
      envFilePath: ['../../.env', '.env', '.env.local'],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    RabbitmqModule,
    MonitorModule,
  ],
})
export class AppModule {}
