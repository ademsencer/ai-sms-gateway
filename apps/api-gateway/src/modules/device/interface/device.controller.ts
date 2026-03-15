import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { EXCHANGE_NAMES, DeviceLifecycleEvent, DeviceEventType } from '@sms-gateway/shared-types';
import { PrismaService } from '@infrastructure/database';
import { RabbitmqService } from '@infrastructure/rabbitmq/rabbitmq.service';
import { RedisService } from '@infrastructure/redis';
import { SmsSocketGateway } from '@infrastructure/socket/socket.gateway';
import { ApiResponseDto } from '@shared/dto/api-response.dto';
import { AuditService } from '@shared/services/audit.service';
import { Public } from '@shared/decorators/public.decorator';
import { Roles } from '@shared/decorators/roles.decorator';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { DeviceEventDto } from './dto/device-event.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceResponseDto, RegisterDeviceResponseDto } from './dto/device-response.dto';

@ApiTags('Devices')
@Controller('device')
export class DeviceController {
  private readonly logger = new Logger(DeviceController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitmqService,
    private readonly redis: RedisService,
    private readonly socketGateway: SmsSocketGateway,
    private readonly auditService: AuditService,
  ) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new device', description: 'Registers a new Android device and returns an API key for authentication.' })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  @ApiResponse({ status: 409, description: 'Device already registered' })
  async register(@Body() dto: RegisterDeviceDto): Promise<ApiResponseDto<RegisterDeviceResponseDto>> {
    const existing = await this.prisma.device.findUnique({
      where: { deviceId: dto.deviceId },
    });

    if (existing) {
      return ApiResponseDto.fail<RegisterDeviceResponseDto>('Device already registered');
    }

    const apiKey = uuidv4();
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

    const created = await this.prisma.device.create({
      data: {
        deviceId: dto.deviceId,
        apiKeyHash,
        ownerName: dto.ownerName,
        iban: dto.iban,
        androidVersion: dto.androidVersion,
        model: dto.model,
        serialNumber: dto.serialNumber,
      },
    });

    this.logger.log(`Device registered: ${dto.deviceId} — model: ${dto.model}, android: ${dto.androidVersion}`);

    // Publish Redis event for real-time dashboard update
    await this.redis.publish('device:registered', {
      deviceId: created.deviceId,
      ownerName: created.ownerName,
      iban: created.iban,
      model: created.model,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    });

    // Audit log
    await this.auditService.log({
      username: 'system',
      action: 'register_device',
      target: dto.deviceId,
      details: JSON.stringify({ ownerName: dto.ownerName, model: dto.model }),
    });

    return ApiResponseDto.ok<RegisterDeviceResponseDto>(
      { deviceId: dto.deviceId, apiKey },
      'Device registered successfully. Store the API key securely.',
    );
  }

  @Post(':deviceId/regenerate-key')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate device API key', description: 'Generates a new API key for an existing device.' })
  @ApiResponse({ status: 200, description: 'New API key generated' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async regenerateKey(@Param('deviceId') deviceId: string): Promise<ApiResponseDto<{ deviceId: string; apiKey: string }>> {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!device) {
      return ApiResponseDto.fail<{ deviceId: string; apiKey: string }>('Device not found');
    }

    const apiKey = uuidv4();
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

    await this.prisma.device.update({
      where: { deviceId },
      data: { apiKeyHash },
    });

    this.logger.log(`API key regenerated for device: ${deviceId}`);
    return ApiResponseDto.ok({ deviceId, apiKey }, 'API key regenerated. Store it securely.');
  }

  @Post('event')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('x-device-key')
  @ApiOperation({ summary: 'Report device lifecycle event', description: 'Reports device events (connected, disconnected, error) for Telegram notifications.' })
  @ApiResponse({ status: 200, description: 'Event accepted' })
  async reportEvent(@Body() dto: DeviceEventDto, @Req() req: any): Promise<ApiResponseDto<{ accepted: boolean }>> {
    const device = req.device || { deviceId: dto.deviceId, model: 'Unknown' };

    const routingKey = `device.${dto.eventType}`;
    const event: DeviceLifecycleEvent = {
      deviceId: device.deviceId,
      deviceName: device.model || device.deviceId,
      ownerName: device.ownerName,
      iban: device.iban,
      eventType: dto.eventType as DeviceEventType,
      message: dto.message,
      occurredAt: new Date().toISOString(),
    };

    await this.rabbitmq.publish(EXCHANGE_NAMES.DEVICE_EVENTS, routingKey, event as unknown as Record<string, unknown>);

    // Update device status in DB
    const statusMap: Record<string, string> = { connected: 'online', disconnected: 'offline', error: 'error', heartbeat: 'online' };
    const status = statusMap[dto.eventType] || device.status;
    if (statusMap[dto.eventType]) {
      await this.prisma.device.update({ where: { deviceId: device.deviceId }, data: { status, lastSeen: new Date() } });
    }

    // Update heartbeat TTL in Redis for heartbeat events
    if (dto.eventType === 'heartbeat' || dto.eventType === 'connected') {
      await this.redis.setHeartbeat(device.deviceId, 120);
    }

    // Emit real-time status to dashboard via WebSocket
    this.socketGateway.emitDeviceStatus({ deviceId: device.deviceId, status, lastSeen: new Date().toISOString() });

    this.logger.log(`Device event: ${device.deviceId} — ${dto.eventType}`);

    return ApiResponseDto.ok({ accepted: true }, 'Event accepted');
  }

  @Get('/')
  @Public()
  @ApiOperation({ summary: 'List devices', description: 'Returns paginated devices with optional filters.' })
  @ApiResponse({ status: 200, description: 'Paginated list of devices' })
  async listDevices(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ): Promise<ApiResponseDto<{ data: DeviceResponseDto[]; total: number; page: number; limit: number; totalPages: number }>> {
    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(limitStr || '20', 10) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { ownerName: { contains: search } },
        { iban: { contains: search } },
        { deviceId: { contains: search } },
        { model: { contains: search } },
      ];
    }

    const [devices, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        orderBy: { lastSeen: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.device.count({ where }),
    ]);

    const data: DeviceResponseDto[] = devices.map((d) => ({
      id: d.id,
      deviceId: d.deviceId,
      ownerName: d.ownerName,
      iban: d.iban,
      androidVersion: d.androidVersion ?? undefined,
      model: d.model ?? undefined,
      serialNumber: d.serialNumber ?? undefined,
      status: d.status,
      lastSeen: d.lastSeen.toISOString(),
      createdAt: d.createdAt.toISOString(),
    }));

    return ApiResponseDto.ok({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }

  @Patch(':deviceId')
  @Roles('admin')
  @ApiOperation({ summary: 'Update device (admin only)' })
  async updateDevice(@Param('deviceId') deviceId: string, @Body() dto: UpdateDeviceDto) {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!device) return ApiResponseDto.fail('Device not found');
    const updated = await this.prisma.device.update({
      where: { deviceId },
      data: { model: dto.model },
    });
    this.logger.log(`Device updated: ${deviceId}`);
    return ApiResponseDto.ok({ deviceId: updated.deviceId, model: updated.model }, 'Device updated');
  }

  @Delete(':deviceId')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete device (admin only)' })
  async deleteDevice(@Param('deviceId') deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!device) return ApiResponseDto.fail('Device not found');
    await this.prisma.device.delete({ where: { deviceId } });
    this.logger.log(`Device deleted: ${deviceId}`);

    // Audit log
    await this.auditService.log({
      username: 'admin',
      action: 'delete_device',
      target: deviceId,
    });

    return ApiResponseDto.ok(null, 'Device deleted');
  }
}
