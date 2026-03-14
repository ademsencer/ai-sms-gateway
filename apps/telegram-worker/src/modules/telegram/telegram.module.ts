import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramConsumerService } from './telegram-consumer.service';
import { DeviceEventConsumerService } from './device-event-consumer.service';

@Module({
  providers: [TelegramService, TelegramConsumerService, DeviceEventConsumerService],
})
export class TelegramModule {}
