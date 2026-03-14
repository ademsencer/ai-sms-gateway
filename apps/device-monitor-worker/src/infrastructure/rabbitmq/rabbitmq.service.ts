import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel } from 'amqplib';
import { EXCHANGE_NAMES, QUEUE_NAMES } from '@sms-gateway/shared-types';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connection!: amqp.AmqpConnectionManager;
  private channelWrapper!: ChannelWrapper;

  constructor(@Inject('RABBITMQ_CONFIG') private readonly config: { url: string }) {}

  async onModuleInit(): Promise<void> {
    this.connection = amqp.connect([this.config.url]);
    this.connection.on('connect', () => this.logger.log('RabbitMQ connected'));
    this.connection.on('disconnect', (err: { err: Error }) =>
      this.logger.error(`RabbitMQ disconnected: ${err.err.message}`),
    );

    this.channelWrapper = this.connection.createChannel({
      setup: async (channel: Channel) => {
        await channel.assertExchange(EXCHANGE_NAMES.DEVICE_EVENTS, 'topic', { durable: true });
        await channel.assertQueue(QUEUE_NAMES.DEVICE_TELEGRAM_NOTIFICATIONS, { durable: true });
        await channel.bindQueue(QUEUE_NAMES.DEVICE_TELEGRAM_NOTIFICATIONS, EXCHANGE_NAMES.DEVICE_EVENTS, 'device.*');
      },
    });

    await this.channelWrapper.waitForConnect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.channelWrapper?.close();
    await this.connection?.close();
  }

  async publish(exchange: string, routingKey: string, message: Record<string, unknown>): Promise<void> {
    await this.channelWrapper.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      contentType: 'application/json',
      timestamp: Math.floor(Date.now() / 1000),
    });
    this.logger.debug(`Published to ${exchange}/${routingKey}`);
  }
}
