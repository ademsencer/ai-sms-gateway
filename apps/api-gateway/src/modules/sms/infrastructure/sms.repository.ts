import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { ISmsRepository } from '../domain/sms-repository.interface';
import { SmsEntity } from '../domain/sms.entity';

@Injectable()
export class SmsRepository implements ISmsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    deviceId: string;
    sender: string;
    message: string;
    timestamp: bigint;
    otpCode: string | null;
  }): Promise<SmsEntity> {
    const sms = await this.prisma.smsMessage.create({ data });
    return this.toEntity(sms);
  }

  async findAll(params: {
    page: number;
    limit: number;
    deviceId?: string;
  }): Promise<{ data: SmsEntity[]; total: number }> {
    const where = params.deviceId ? { deviceId: params.deviceId } : {};
    const skip = (params.page - 1) * params.limit;

    const [data, total] = await Promise.all([
      this.prisma.smsMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: params.limit,
      }),
      this.prisma.smsMessage.count({ where }),
    ]);

    return {
      data: data.map((s) => this.toEntity(s)),
      total,
    };
  }

  async countSince(since: Date): Promise<number> {
    return this.prisma.smsMessage.count({
      where: { createdAt: { gte: since } },
    });
  }

  private toEntity(raw: {
    id: string;
    deviceId: string;
    sender: string;
    message: string;
    timestamp: bigint;
    otpCode: string | null;
    createdAt: Date;
  }): SmsEntity {
    return new SmsEntity(
      raw.id,
      raw.deviceId,
      raw.sender,
      raw.message,
      raw.timestamp,
      raw.otpCode,
      raw.createdAt,
    );
  }
}
