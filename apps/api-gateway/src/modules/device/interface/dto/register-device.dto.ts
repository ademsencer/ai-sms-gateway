import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDeviceDto {
  /** Unique device identifier (e.g. device_001) */
  @ApiProperty({ example: 'device_001', description: 'Unique device identifier' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(64)
  deviceId: string;

  /** Human-readable device name */
  @ApiProperty({ example: 'Samsung Galaxy S24', description: 'Device display name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(128)
  name: string;
}
