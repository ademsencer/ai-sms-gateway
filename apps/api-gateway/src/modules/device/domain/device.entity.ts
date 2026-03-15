export class DeviceEntity {
  constructor(
    public readonly id: string,
    public readonly deviceId: string,
    public readonly status: string,
    public readonly model: string | null,
    public readonly androidVersion: string | null,
    public readonly serialNumber: string | null,
    public readonly lastSeen: Date,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
