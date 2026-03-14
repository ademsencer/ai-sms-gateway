import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@infrastructure/database';
import { RedisService } from '@infrastructure/redis';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';

@Injectable()
export class DeviceKeyGuard implements CanActivate {
  private readonly logger = new Logger(DeviceKeyGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const deviceKey = request.headers['x-device-key'] as string | undefined;

    if (!deviceKey) {
      throw new HttpException('Missing x-device-key header', HttpStatus.UNAUTHORIZED);
    }

    // Extract deviceId from body or query
    const deviceId = request.body?.deviceId || request.query?.deviceId;
    if (!deviceId) {
      throw new HttpException('Missing deviceId', HttpStatus.BAD_REQUEST);
    }

    // Look up device
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new HttpException('Device not found', HttpStatus.UNAUTHORIZED);
    }

    // Verify API key
    const isValid = await bcrypt.compare(deviceKey, device.apiKeyHash);
    if (!isValid) {
      this.logger.warn(`Invalid API key attempt for device: ${deviceId}`);
      throw new HttpException('Invalid API key', HttpStatus.UNAUTHORIZED);
    }

    // Update heartbeat
    const heartbeatTtl = 120;
    await this.redisService.setHeartbeat(deviceId, heartbeatTtl);

    // Update last seen
    await this.prisma.device.update({
      where: { deviceId },
      data: { lastSeen: new Date(), status: 'online' },
    });

    // Attach device to request
    request.device = device;
    return true;
  }
}
