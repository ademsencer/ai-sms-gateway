import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RabbitmqService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { TelegramService } from './telegram.service';
import { QUEUE_NAMES, DeviceLifecycleEvent } from '@sms-gateway/shared-types';

@Injectable()
export class DeviceEventConsumerService implements OnModuleInit {
  private readonly logger = new Logger(DeviceEventConsumerService.name);

  constructor(
    private readonly rabbitmq: RabbitmqService,
    private readonly telegram: TelegramService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Starting device event consumer...');
    await this.rabbitmq.consume(QUEUE_NAMES.DEVICE_TELEGRAM_NOTIFICATIONS, this.handleEvent.bind(this));
    this.logger.log('Device event consumer started');
  }

  private async handleEvent(raw: Record<string, unknown>): Promise<void> {
    const event = raw as unknown as DeviceLifecycleEvent;

    // Skip heartbeat events — they flood Telegram with notifications
    if (event.eventType === 'heartbeat') {
      return;
    }

    this.logger.log(`Device event: ${event.deviceId} — ${event.eventType}`);
    await this.telegram.sendDeviceNotification(event);
  }
}
