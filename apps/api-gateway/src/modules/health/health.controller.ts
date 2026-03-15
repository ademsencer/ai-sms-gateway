import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@shared/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database';
import { RedisService } from '@infrastructure/redis';
import { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly version: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    // Read version from VERSION file (mounted in Docker or project root)
    try {
      const versionPath = path.resolve(process.cwd(), 'VERSION');
      this.version = fs.readFileSync(versionPath, 'utf-8').trim();
    } catch {
      this.version = '0.0.0';
    }
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check', description: 'Returns service health status.' })
  async check(@Req() req: Request): Promise<{
    status: string;
    version: string;
    apkUrl: string;
    timestamp: string;
    services: Record<string, string>;
  }> {
    const services: Record<string, string> = {};

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.database = 'healthy';
    } catch {
      services.database = 'unhealthy';
    }

    // Check Redis
    try {
      await this.redis.set('health:check', 'ok', 5);
      services.redis = 'healthy';
    } catch {
      services.redis = 'unhealthy';
    }

    const allHealthy = Object.values(services).every((s) => s === 'healthy');

    // Build APK download URL from request origin
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost';
    const apkUrl = `${proto}://${host}/downloads/sms-gateway-latest.apk`;

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      version: this.version,
      apkUrl,
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
