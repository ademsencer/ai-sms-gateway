import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@shared/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database';
import { RedisService } from '@infrastructure/redis';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check', description: 'Returns service health status.' })
  async check(): Promise<{
    status: string;
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

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
