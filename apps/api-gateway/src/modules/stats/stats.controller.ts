import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@shared/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database';
import { ApiResponseDto } from '@shared/dto/api-response.dto';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Dashboard statistics', description: 'Returns aggregate stats for the dashboard.' })
  async getStats(): Promise<
    ApiResponseDto<{
      totalSms: number;
      totalDevices: number;
      onlineDevices: number;
      smsLastMinute: number;
    }>
  > {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const [totalSms, totalDevices, onlineDevices, smsLastMinute] = await Promise.all([
      this.prisma.smsMessage.count(),
      this.prisma.device.count(),
      this.prisma.device.count({ where: { status: 'online' } }),
      this.prisma.smsMessage.count({ where: { createdAt: { gte: oneMinuteAgo } } }),
    ]);

    return ApiResponseDto.ok({
      totalSms,
      totalDevices,
      onlineDevices,
      smsLastMinute,
    });
  }
}
