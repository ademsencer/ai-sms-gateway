import { Module } from '@nestjs/common';
import { SmsSocketGateway } from './socket.gateway';

@Module({
  providers: [SmsSocketGateway],
  exports: [SmsSocketGateway],
})
export class SocketModule {}
