import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@infrastructure/redis';
import { WS_EVENTS } from '@sms-gateway/shared-types';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/events',
  transports: ['websocket', 'polling'],
})
export class SmsSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SmsSocketGateway.name);
  private subscriber!: Redis;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleInit(): Promise<void> {
    // Create a duplicate connection for subscribing (ioredis requires separate connection for sub)
    this.subscriber = this.redis.duplicate();

    this.subscriber.subscribe('sms:realtime', 'device:status', 'device:registered', (err) => {
      if (err) {
        this.logger.error(`Redis subscribe error: ${err.message}`);
      } else {
        this.logger.log('Subscribed to Redis pub/sub channels: sms:realtime, device:status, device:registered');
      }
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        if (channel === 'sms:realtime') {
          this.server.emit(WS_EVENTS.SMS_RECEIVED, data);
        } else if (channel === 'device:status') {
          this.server.emit(WS_EVENTS.DEVICE_STATUS, data);
        } else if (channel === 'device:registered') {
          this.server.emit(WS_EVENTS.DEVICE_REGISTERED, data);
        }
      } catch (error) {
        this.logger.error(`Failed to parse Redis pub/sub message: ${error}`);
      }
    });
  }

  afterInit(): void {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /** Emit SMS received event directly (for in-process use) */
  emitSmsReceived(data: Record<string, unknown>): void {
    this.server.emit(WS_EVENTS.SMS_RECEIVED, data);
  }

  /** Emit device status change directly (for in-process use) */
  emitDeviceStatus(data: Record<string, unknown>): void {
    this.server.emit(WS_EVENTS.DEVICE_STATUS, data);
  }

  /** Emit stats update */
  emitStatsUpdate(data: Record<string, unknown>): void {
    this.server.emit(WS_EVENTS.STATS_UPDATE, data);
  }
}
