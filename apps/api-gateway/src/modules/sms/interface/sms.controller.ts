import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { RabbitmqService } from '@infrastructure/rabbitmq';
import { RedisService } from '@infrastructure/redis';
import { PrismaService } from '@infrastructure/database';
import { ApiResponseDto } from '@shared/dto/api-response.dto';
import { Public } from '@shared/decorators/public.decorator';
import { Roles } from '@shared/decorators/roles.decorator';
import { AuditService } from '@shared/services/audit.service';
import { EXCHANGE_NAMES, ROUTING_KEYS, SmsReceivedEvent } from '@sms-gateway/shared-types';
import { generateSmsDedupKey } from '@sms-gateway/shared-utils';
import { IngestSmsDto } from './dto/ingest-sms.dto';
import { SmsResponseDto } from './dto/sms-response.dto';
import { SmsQueryDto } from './dto/sms-query.dto';

@ApiTags('SMS')
@Controller()
export class SmsController {
  private readonly logger = new Logger(SmsController.name);

  constructor(
    private readonly rabbitmq: RabbitmqService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  @Post('sms')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiSecurity('x-device-key')
  @ApiOperation({
    summary: 'Ingest an SMS message',
    description: 'Receives an SMS from an Android device and publishes it to the processing queue.',
  })
  @ApiResponse({ status: 202, description: 'SMS accepted for processing' })
  @ApiResponse({ status: 401, description: 'Invalid or missing device key' })
  @ApiResponse({ status: 409, description: 'Duplicate SMS' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async ingestSms(@Body() dto: IngestSmsDto): Promise<ApiResponseDto<{ queued: boolean }>> {
    // Deduplication check
    const dedupKey = generateSmsDedupKey(dto.deviceId, dto.sender, dto.message, dto.timestamp);
    const dedupTtl = this.configService.get<number>('device.smsDedupTtl', 300);
    const isDuplicate = await this.redis.checkDedup(dedupKey, dedupTtl);

    if (isDuplicate) {
      this.logger.warn(`Duplicate SMS detected from ${dto.deviceId}: ${dedupKey.slice(0, 16)}...`);
      return ApiResponseDto.fail<{ queued: boolean }>('Duplicate SMS');
    }

    // Fetch device info for Telegram notification
    const device = await this.prisma.device.findUnique({
      where: { deviceId: dto.deviceId },
      select: { model: true, ownerName: true, iban: true },
    });

    // Publish to RabbitMQ
    const event: SmsReceivedEvent = {
      deviceId: dto.deviceId,
      deviceModel: device?.model ?? undefined,
      ownerName: device?.ownerName ?? undefined,
      iban: device?.iban ?? undefined,
      sender: dto.sender,
      message: dto.message,
      timestamp: dto.timestamp,
      receivedAt: new Date().toISOString(),
    };

    await this.rabbitmq.publish(
      EXCHANGE_NAMES.SMS_EVENTS,
      ROUTING_KEYS.SMS_RECEIVED,
      event as unknown as Record<string, unknown>,
    );

    this.logger.log(`SMS queued from device ${dto.deviceId} — sender: ${dto.sender}`);
    return ApiResponseDto.ok({ queued: true }, 'SMS accepted for processing');
  }

  @Get('sms')
  @Public()
  @ApiOperation({
    summary: 'List SMS messages',
    description: 'Returns paginated SMS messages with optional device filter.',
  })
  @ApiResponse({ status: 200, description: 'Paginated SMS list' })
  async listSms(@Query() query: SmsQueryDto): Promise<
    ApiResponseDto<{
      data: SmsResponseDto[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
  > {
    const page = query.page || 1;
    const limit = query.limit || 50;

    const where = query.deviceId ? { deviceId: query.deviceId } : {};
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.smsMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.smsMessage.count({ where }),
    ]);

    const data: SmsResponseDto[] = messages.map((m) => ({
      id: m.id,
      deviceId: m.deviceId,
      sender: m.sender,
      message: m.message,
      timestamp: Number(m.timestamp),
      otpCode: m.otpCode,
      createdAt: m.createdAt.toISOString(),
    }));

    return ApiResponseDto.ok({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  @Delete('sms/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a single SMS message (admin only)' })
  async deleteSms(@Param('id') id: string, @Req() req: any) {
    await this.prisma.smsMessage.delete({ where: { id } });
    await this.auditService.log({
      userId: req.user?.id,
      username: req.user?.username || 'admin',
      action: 'delete_sms',
      target: `sms:${id}`,
      ipAddress: req.ip,
    });
    return ApiResponseDto.ok({ deleted: true });
  }

  @Delete('sms')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete all SMS messages (admin only)' })
  async deleteAllSms(@Req() req: any) {
    const result = await this.prisma.smsMessage.deleteMany();
    await this.auditService.log({
      userId: req.user?.id,
      username: req.user?.username || 'admin',
      action: 'clear_all_sms',
      target: 'sms_messages',
      details: `Deleted ${result.count} messages`,
      ipAddress: req.ip,
    });
    return ApiResponseDto.ok({ deleted: result.count });
  }
}
