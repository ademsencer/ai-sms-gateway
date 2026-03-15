import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeviceEventDto {
  @ApiProperty({ example: 'device_001' })
  @IsString()
  deviceId: string;

  @ApiProperty({ enum: ['connected', 'disconnected', 'error', 'heartbeat', 'heartbeat_lost'] })
  @IsIn(['connected', 'disconnected', 'error', 'heartbeat', 'heartbeat_lost'])
  eventType: string;

  @ApiProperty({ required: false, example: 'Connection lost' })
  @IsOptional()
  @IsString()
  message?: string;
}
