import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { IDeviceRepository } from '../domain/device-repository.interface';
import { DeviceEntity } from '../domain/device.entity';

@Injectable()
export class DeviceRepository implements IDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(deviceId: string, name: string, apiKeyHash: string): Promise<DeviceEntity> {
    const device = await this.prisma.device.create({
      data: { deviceId, name, apiKeyHash },
    });
    return this.toEntity(device);
  }

  async findByDeviceId(deviceId: string): Promise<DeviceEntity | null> {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });
    return device ? this.toEntity(device) : null;
  }

  async findAll(): Promise<DeviceEntity[]> {
    const devices = await this.prisma.device.findMany({
      orderBy: { lastSeen: 'desc' },
    });
    return devices.map((d) => this.toEntity(d));
  }

  async updateStatus(deviceId: string, status: string): Promise<void> {
    await this.prisma.device.update({
      where: { deviceId },
      data: { status },
    });
  }

  async updateLastSeen(deviceId: string): Promise<void> {
    await this.prisma.device.update({
      where: { deviceId },
      data: { lastSeen: new Date() },
    });
  }

  private toEntity(raw: {
    id: string;
    deviceId: string;
    name: string;
    status: string;
    lastSeen: Date;
    createdAt: Date;
    updatedAt: Date;
  }): DeviceEntity {
    return new DeviceEntity(
      raw.id,
      raw.deviceId,
      raw.name,
      raw.status,
      raw.lastSeen,
      raw.createdAt,
      raw.updatedAt,
    );
  }
}
