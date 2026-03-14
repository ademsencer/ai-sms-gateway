import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConsumeMessage, Channel } from 'amqplib';
import { EXCHANGE_NAMES, QUEUE_NAMES, ROUTING_KEYS } from '@sms-gateway/shared-types';

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
        await channel.assertExchange(EXCHANGE_NAMES.SMS_EVENTS, 'topic', { durable: true });
        await channel.assertQueue(QUEUE_NAMES.SMS_PROCESSING, { durable: true });
        await channel.bindQueue(QUEUE_NAMES.SMS_PROCESSING, EXCHANGE_NAMES.SMS_EVENTS, ROUTING_KEYS.SMS_RECEIVED);
        this.logger.log('RabbitMQ queue configured for SMS processing');
      },
    });

    await this.channelWrapper.waitForConnect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.channelWrapper?.close();
    await this.connection?.close();
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
          this.logger.error(`Error processing message: ${err.message}`);
          channel.nack(msg, false, false);
        }
      });
    });
  }
}
