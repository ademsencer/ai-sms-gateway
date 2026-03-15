import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId?: string;
    username: string;
    action: string;
    target: string;
    details?: string;
    ipAddress?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({ data: params });
    this.logger.log(`[AUDIT] ${params.username} ${params.action} ${params.target}`);
  }

  async findAll(page = 1, limit = 20, filters?: { action?: string; search?: string }) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (filters?.action && filters.action !== 'all') {
      where.action = filters.action;
    }

    if (filters?.search) {
      where.OR = [
        { username: { contains: filters.search } },
        { target: { contains: filters.search } },
        { details: { contains: filters.search } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data: logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async deleteOne(id: string): Promise<void> {
    await this.prisma.auditLog.delete({ where: { id } });
    this.logger.log(`[AUDIT] Deleted audit log entry: ${id}`);
  }

  async deleteAll(): Promise<number> {
    const result = await this.prisma.auditLog.deleteMany();
    this.logger.log(`[AUDIT] Deleted all audit logs: ${result.count} entries`);
    return result.count;
  }
}
