import { SmsEntity } from './sms.entity';

export const SMS_REPOSITORY = Symbol('SMS_REPOSITORY');

export interface ISmsRepository {
  create(data: {
    deviceId: string;
    sender: string;
    message: string;
    timestamp: bigint;
    otpCode: string | null;
  }): Promise<SmsEntity>;
  findAll(params: { page: number; limit: number; deviceId?: string }): Promise<{
    data: SmsEntity[];
    total: number;
  }>;
  countSince(since: Date): Promise<number>;
}
