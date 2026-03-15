import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RabbitmqService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { TelegramService } from './telegram.service';
import { QUEUE_NAMES, SmsReceivedEvent } from '@sms-gateway/shared-types';

@Injectable()
export class TelegramConsumerService implements OnModuleInit {
  private readonly logger = new Logger(TelegramConsumerService.name);

  constructor(
    private readonly rabbitmq: RabbitmqService,
    private readonly telegram: TelegramService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Starting Telegram forwarding consumer...');
    await this.rabbitmq.consume(QUEUE_NAMES.TELEGRAM_FORWARDING, this.handleMessage.bind(this));
    this.logger.log('Telegram forwarding consumer started');
  }

  private async handleMessage(raw: Record<string, unknown>): Promise<void> {
    const event = raw as unknown as SmsReceivedEvent;

    this.logger.log(`Forwarding SMS to Telegram — device: ${event.deviceId}, sender: ${event.sender}`);
    await this.telegram.sendMessage({
      deviceId: event.deviceId,
      sender: event.sender,
      message: event.message,
      ownerName: event.ownerName,
      iban: event.iban,
    });
  }
}
