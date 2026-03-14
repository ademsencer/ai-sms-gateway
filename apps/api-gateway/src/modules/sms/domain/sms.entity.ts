export class SmsEntity {
  constructor(
    public readonly id: string,
    public readonly deviceId: string,
    public readonly sender: string,
    public readonly message: string,
    public readonly timestamp: bigint,
    public readonly otpCode: string | null,
    public readonly createdAt: Date,
  ) {}
}
