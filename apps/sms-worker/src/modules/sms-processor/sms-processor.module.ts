import { Module } from '@nestjs/common';
import { SmsProcessorService } from './sms-processor.service';

@Module({
  providers: [SmsProcessorService],
})
export class SmsProcessorModule {}
