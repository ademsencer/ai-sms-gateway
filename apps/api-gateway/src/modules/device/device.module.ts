import { Module } from '@nestjs/common';
import { DeviceController } from './interface/device.controller';
import { DeviceRepository } from './infrastructure/device.repository';
import { DEVICE_REPOSITORY } from './domain/device-repository.interface';
import { SocketModule } from '@infrastructure/socket';

@Module({
  imports: [SocketModule],
  controllers: [DeviceController],
  providers: [
    {
      provide: DEVICE_REPOSITORY,
      useClass: DeviceRepository,
    },
  ],
  exports: [DEVICE_REPOSITORY],
})
export class DeviceModule {}
