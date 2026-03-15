import { DeviceEntity } from './device.entity';

export const DEVICE_REPOSITORY = Symbol('DEVICE_REPOSITORY');

export interface IDeviceRepository {
  create(deviceId: string, apiKeyHash: string, ownerName: string, iban: string): Promise<DeviceEntity>;
  findByDeviceId(deviceId: string): Promise<DeviceEntity | null>;
  findAll(): Promise<DeviceEntity[]>;
  updateStatus(deviceId: string, status: string): Promise<void>;
  updateLastSeen(deviceId: string): Promise<void>;
}
