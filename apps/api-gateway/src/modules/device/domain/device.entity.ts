export class DeviceEntity {
  constructor(
    public readonly id: string,
    public readonly deviceId: string,
    public readonly name: string,
    public readonly status: string,
    public readonly lastSeen: Date,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
