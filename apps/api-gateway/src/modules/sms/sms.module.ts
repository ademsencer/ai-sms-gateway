import { Module } from '@nestjs/common';
import { SmsController } from './interface/sms.controller';
import { SmsRepository } from './infrastructure/sms.repository';
import { SMS_REPOSITORY } from './domain/sms-repository.interface';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [SmsController],
  providers: [
    {
      provide: SMS_REPOSITORY,
      useClass: SmsRepository,
    },
  ],
  exports: [SMS_REPOSITORY],
})
export class SmsModule {}
