import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { rabbitmqConfig, telegramConfig } from './infrastructure/config/app.config';
import { RabbitmqModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { TelegramModule } from './modules/telegram/telegram.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [rabbitmqConfig, telegramConfig],
      envFilePath: ['../../.env', '.env', '.env.local'],
    }),
    RabbitmqModule,
    TelegramModule,
  ],
})
export class AppModule {}
