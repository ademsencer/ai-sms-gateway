import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig, redisConfig, rabbitmqConfig } from './infrastructure/config/app.config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { RabbitmqModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { SmsProcessorModule } from './modules/sms-processor/sms-processor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, rabbitmqConfig],
      envFilePath: ['../../.env', '.env', '.env.local'],
    }),
    DatabaseModule,
    RedisModule,
    RabbitmqModule,
    SmsProcessorModule,
  ],
})
export class AppModule {}
