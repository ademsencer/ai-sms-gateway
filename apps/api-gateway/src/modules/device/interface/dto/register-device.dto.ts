import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  /** Unique device identifier (e.g. device_001) */
  @ApiProperty({ example: 'device_001', description: 'Unique device identifier' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(64)
  deviceId: string;

  /** Human-readable device name (must be unique) */
  @ApiProperty({ example: 'Samsung Galaxy S24', description: 'Device display name (must be unique)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(128)
  name: string;

  /** Android version */
  @ApiPropertyOptional({ example: '15', description: 'Android OS version' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  androidVersion?: string;

  /** Device model */
  @ApiPropertyOptional({ example: 'Tecno Spark 40C', description: 'Device model name' })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  model?: string;

  /** Device serial number */
  @ApiPropertyOptional({ example: 'ABC123DEF456', description: 'Device serial number' })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  serialNumber?: string;
}
