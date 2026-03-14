import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to database');

    // @ts-expect-error Prisma event typing
    this.$on('error', (e: { message: string }) => {
      this.logger.error(`Prisma error: ${e.message}`);
    });

    // Auto-seed admin user if none exists
    await this.seedAdminUser();
  }

  private async seedAdminUser(): Promise<void> {
    try {
      const adminCount = await this.user.count({ where: { role: 'admin' } });
      if (adminCount === 0) {
        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD || 'changeme';
        const passwordHash = await bcrypt.hash(password, 10);
        await this.user.create({
          data: { username, passwordHash, role: 'admin' },
        });
        this.logger.log(`Admin user "${username}" created automatically`);
      }
    } catch (error) {
      this.logger.warn(`Admin seed skipped: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from database');
  }
}
