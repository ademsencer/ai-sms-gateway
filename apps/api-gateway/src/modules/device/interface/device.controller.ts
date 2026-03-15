import { Controller, Post, Get, Patch, Delete, Body, Param, Req, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { EXCHANGE_NAMES, DeviceLifecycleEvent, DeviceEventType } from '@sms-gateway/shared-types';
import { PrismaService } from '@infrastructure/database';
import { RabbitmqService } from '@infrastructure/rabbitmq/rabbitmq.service';
import { SmsSocketGateway } from '@infrastructure/socket/socket.gateway';
import { ApiResponseDto } from '@shared/dto/api-response.dto';
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
    private readonly socketGateway: SmsSocketGateway,
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

    // Check unique name
    const nameExists = await this.prisma.device.findUnique({
      where: { name: dto.name },
    });

    if (nameExists) {
      return ApiResponseDto.fail<RegisterDeviceResponseDto>('A device with this name already exists');
    }

    const apiKey = uuidv4();
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

    await this.prisma.device.create({
      data: {
        deviceId: dto.deviceId,
        name: dto.name,
        apiKeyHash,
        androidVersion: dto.androidVersion,
        model: dto.model,
        serialNumber: dto.serialNumber,
      },
    });

    this.logger.log(`Device registered: ${dto.deviceId} (${dto.name}) — model: ${dto.model}, android: ${dto.androidVersion}`);

    return ApiResponseDto.ok<RegisterDeviceResponseDto>(
      { deviceId: dto.deviceId, name: dto.name, apiKey },
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
    const device = req.device || { deviceId: dto.deviceId, name: 'Unknown' };

    const routingKey = `device.${dto.eventType}`;
    const event: DeviceLifecycleEvent = {
      deviceId: device.deviceId,
      deviceName: device.name,
      eventType: dto.eventType as DeviceEventType,
      message: dto.message,
      occurredAt: new Date().toISOString(),
    };

    await this.rabbitmq.publish(EXCHANGE_NAMES.DEVICE_EVENTS, routingKey, event as unknown as Record<string, unknown>);

    // Update device status in DB
    const statusMap: Record<string, string> = { connected: 'online', disconnected: 'offline', error: 'error' };
    const status = statusMap[dto.eventType] || device.status;
    if (statusMap[dto.eventType]) {
      await this.prisma.device.update({ where: { deviceId: device.deviceId }, data: { status, lastSeen: new Date() } });
    }

    // Emit real-time status to dashboard via WebSocket
    this.socketGateway.emitDeviceStatus({ deviceId: device.deviceId, status, lastSeen: new Date().toISOString() });

    this.logger.log(`Device event: ${device.deviceId} — ${dto.eventType}`);

    return ApiResponseDto.ok({ accepted: true }, 'Event accepted');
  }

  @Get('/')
  @Public()
  @ApiOperation({ summary: 'List all devices', description: 'Returns all registered devices with their current status.' })
  @ApiResponse({ status: 200, description: 'List of devices' })
  async listDevices(): Promise<ApiResponseDto<DeviceResponseDto[]>> {
    const devices = await this.prisma.device.findMany({
      orderBy: { lastSeen: 'desc' },
    });

    const result: DeviceResponseDto[] = devices.map((d) => ({
      id: d.id,
      deviceId: d.deviceId,
      name: d.name,
      androidVersion: d.androidVersion ?? undefined,
      model: d.model ?? undefined,
      serialNumber: d.serialNumber ?? undefined,
      status: d.status,
      lastSeen: d.lastSeen.toISOString(),
      createdAt: d.createdAt.toISOString(),
    }));

    return ApiResponseDto.ok(result);
  }

  @Patch(':deviceId')
  @Roles('admin')
  @ApiOperation({ summary: 'Update device (admin only)' })
  async updateDevice(@Param('deviceId') deviceId: string, @Body() dto: UpdateDeviceDto) {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!device) return ApiResponseDto.fail('Device not found');
    const updated = await this.prisma.device.update({
      where: { deviceId },
      data: { name: dto.name },
    });
    this.logger.log(`Device updated: ${deviceId}`);
    return ApiResponseDto.ok({ deviceId: updated.deviceId, name: updated.name }, 'Device updated');
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
    return ApiResponseDto.ok(null, 'Device deleted');
  }
}
