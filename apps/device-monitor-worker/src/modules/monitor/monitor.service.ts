import { Injectable, Inject, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import Redis from 'ioredis';
import { EXCHANGE_NAMES } from '@sms-gateway/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RabbitmqService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.module';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);
  private readonly checkInterval: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitmqService,
    private readonly configService: ConfigService,
  ) {
    this.checkInterval = this.configService.get<number>('device.heartbeatCheckInterval', 30000);
  }

  @Interval(30000)
  async checkDeviceHeartbeats(): Promise<void> {
    this.logger.debug('Checking device heartbeats...');

    const onlineDevices = await this.prisma.device.findMany({
      where: { status: 'online' },
    });

    for (const device of onlineDevices) {
      const heartbeatKey = `device:heartbeat:${device.deviceId}`;
      const exists = await this.redis.exists(heartbeatKey);

      if (!exists) {
        this.logger.warn(`Device ${device.deviceId} heartbeat expired — marking offline`);

        await this.prisma.device.update({
          where: { deviceId: device.deviceId },
          data: { status: 'offline' },
        });

        // Publish status change via Redis pub/sub (for dashboard WebSocket)
        await this.redis.publish(
          'device:status',
          JSON.stringify({
            deviceId: device.deviceId,
            status: 'offline',
            lastSeen: device.lastSeen.toISOString(),
          }),
        );

        // Publish heartbeat_lost event to RabbitMQ (for Telegram notification)
        await this.rabbitmq.publish(EXCHANGE_NAMES.DEVICE_EVENTS, 'device.heartbeat_lost', {
          deviceId: device.deviceId,
          deviceName: device.model || device.deviceId,
          ownerName: device.ownerName,
          iban: device.iban,
          eventType: 'heartbeat_lost',
          message: `Heartbeat expired after ${this.configService.get<number>('device.heartbeatTtl', 120)}s`,
          occurredAt: new Date().toISOString(),
        });
      }
    }
  }
}
