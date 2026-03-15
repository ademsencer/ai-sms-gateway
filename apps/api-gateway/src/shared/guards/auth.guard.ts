import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@infrastructure/database';
import { RedisService } from '@infrastructure/redis';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check @Public() metadata
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // 2. Check for x-device-key header → device-key auth
    const deviceKey = request.headers['x-device-key'] as string | undefined;
    if (deviceKey) {
      return this.authenticateDevice(request, deviceKey);
    }

    // 3. Otherwise, check JWT
    return this.authenticateJwt(request);
  }

  private async authenticateDevice(request: any, deviceKey: string): Promise<boolean> {
    const deviceId = request.body?.deviceId || request.query?.deviceId;
    if (!deviceId) {
      throw new UnauthorizedException('Missing deviceId');
    }

    const device = await this.prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new UnauthorizedException('Device not found');
    }

    const isValid = await bcrypt.compare(deviceKey, device.apiKeyHash);
    if (!isValid) {
      this.logger.warn(`Invalid API key attempt for device: ${deviceId}`);
      throw new UnauthorizedException('Invalid API key');
    }

    // Update heartbeat
    const heartbeatTtl = 120;
    await this.redisService.setHeartbeat(deviceId, heartbeatTtl);

    // Update last seen
    await this.prisma.device.update({
      where: { deviceId },
      data: { lastSeen: new Date(), status: 'online' },
    });

    // Attach device info to request
    request.device = {
      deviceId: device.deviceId,
      model: device.model,
      ownerName: device.ownerName,
      iban: device.iban,
      status: device.status,
    };

    return true;
  }

  private async authenticateJwt(request: any): Promise<boolean> {
    let token: string | undefined;

    // Check Authorization header
    const authHeader = request.headers['authorization'] as string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    // If no Authorization header, check access_token cookie
    if (!token) {
      const cookieHeader = request.headers['cookie'] as string | undefined;
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce(
          (acc, cookie) => {
            const [key, ...valParts] = cookie.trim().split('=');
            if (key) acc[key.trim()] = valParts.join('=').trim();
            return acc;
          },
          {} as Record<string, string>,
        );
        token = cookies['access_token'];
      }
    }

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      // Block twoFactorPending tokens except for /auth/verify-2fa
      if (payload.twoFactorPending) {
        const url = request.url as string;
        if (!url.includes('/auth/verify-2fa')) {
          throw new UnauthorizedException('Two-factor authentication required');
        }
      }

      // Check if user is enabled
      const dbUser = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { enabled: true } });
      if (dbUser && !dbUser.enabled) {
        throw new UnauthorizedException('Account is disabled');
      }

      // Attach user to request
      request.user = {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      };

      return true;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(`JWT verification failed: ${error?.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
