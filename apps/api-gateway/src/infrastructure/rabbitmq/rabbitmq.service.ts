import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConsumeMessage, Channel } from 'amqplib';
import { EXCHANGE_NAMES, QUEUE_NAMES, ROUTING_KEYS } from '@sms-gateway/shared-types';

interface RabbitMQConfig {
  url: string;
}

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connection!: amqp.AmqpConnectionManager;
  private channelWrapper!: ChannelWrapper;

  constructor(@Inject('RABBITMQ_CONFIG') private readonly config: RabbitMQConfig) {}

  async onModuleInit(): Promise<void> {
    this.connection = amqp.connect([this.config.url]);

    this.connection.on('connect', () => {
      this.logger.log('RabbitMQ connected');
    });

    this.connection.on('disconnect', (err: { err: Error }) => {
      this.logger.error(`RabbitMQ disconnected: ${err.err.message}`);
    });

    this.channelWrapper = this.connection.createChannel({
      setup: async (channel: Channel) => {
        // Assert the SMS events exchange
        await channel.assertExchange(EXCHANGE_NAMES.SMS_EVENTS, 'topic', { durable: true });

        // Assert the device events exchange
        await channel.assertExchange(EXCHANGE_NAMES.DEVICE_EVENTS, 'topic', { durable: true });

        // Assert queues
        await channel.assertQueue(QUEUE_NAMES.SMS_PROCESSING, { durable: true });
        await channel.assertQueue(QUEUE_NAMES.TELEGRAM_FORWARDING, { durable: true });
        await channel.assertQueue(QUEUE_NAMES.DEVICE_TELEGRAM_NOTIFICATIONS, { durable: true });

        // Bind queues to exchange — both receive sms.received events
        await channel.bindQueue(QUEUE_NAMES.SMS_PROCESSING, EXCHANGE_NAMES.SMS_EVENTS, ROUTING_KEYS.SMS_RECEIVED);
        await channel.bindQueue(QUEUE_NAMES.TELEGRAM_FORWARDING, EXCHANGE_NAMES.SMS_EVENTS, ROUTING_KEYS.SMS_RECEIVED);

        // Bind device telegram notifications queue with wildcard
        await channel.bindQueue(QUEUE_NAMES.DEVICE_TELEGRAM_NOTIFICATIONS, EXCHANGE_NAMES.DEVICE_EVENTS, 'device.*');

        this.logger.log('RabbitMQ exchanges and queues configured');
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
      deliveryMode: 2,
      contentType: 'application/json',
      timestamp: Math.floor(Date.now() / 1000),
    });
    this.logger.debug(`Published to ${exchange}/${routingKey}`);
  }

  async consume(
    queue: string,
    handler: (message: Record<string, unknown>) => Promise<void>,
  ): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: Channel) => {
      await channel.consume(queue, async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString()) as Record<string, unknown>;
          await handler(content);
          channel.ack(msg);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          this.logger.error(`Error processing message from ${queue}: ${err.message}`);
          channel.nack(msg, false, false);
        }
      });
    });
  }
}
