import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RabbitmqService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { QUEUE_NAMES, SmsReceivedEvent } from '@sms-gateway/shared-types';
import { detectOtp } from '@sms-gateway/shared-utils';

@Injectable()
export class SmsProcessorService implements OnModuleInit {
  private readonly logger = new Logger(SmsProcessorService.name);

  constructor(
    private readonly rabbitmq: RabbitmqService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Starting SMS processing consumer...');
    await this.rabbitmq.consume(QUEUE_NAMES.SMS_PROCESSING, this.handleMessage.bind(this));
    this.logger.log('SMS processing consumer started');
  }

  private async handleMessage(raw: Record<string, unknown>): Promise<void> {
    const event = raw as unknown as SmsReceivedEvent;

    this.logger.log(
      `Processing SMS from device ${event.deviceId} — sender: ${event.sender}`,
    );

    // Detect OTP code
    const otpCode = detectOtp(event.message);
    if (otpCode) {
      this.logger.log(`OTP detected: ${otpCode}`);
    }

    // Store in database
    const sms = await this.prisma.smsMessage.create({
      data: {
        deviceId: event.deviceId,
        sender: event.sender,
        message: event.message,
        timestamp: BigInt(event.timestamp),
        otpCode,
      },
    });

    this.logger.log(`SMS stored: ${sms.id}`);

    // Publish to Redis pub/sub for realtime dashboard updates
    await this.redis.publish('sms:realtime', {
      id: sms.id,
      deviceId: sms.deviceId,
      sender: sms.sender,
      message: sms.message,
      otpCode: sms.otpCode,
      timestamp: Number(sms.timestamp),
      createdAt: sms.createdAt.toISOString(),
    });
  }
}
