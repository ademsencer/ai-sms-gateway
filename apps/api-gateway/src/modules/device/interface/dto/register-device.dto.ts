import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  /** Unique device identifier */
  @ApiProperty({ example: 'device_001', description: 'Unique device identifier' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(64)
  deviceId: string;

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

  /** Owner name */
  @ApiProperty({ example: 'John Doe', description: 'Device owner name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(128)
  ownerName: string;

  /** IBAN */
  @ApiProperty({ example: 'TR330006100519786457841326', description: 'IBAN number' })
  @IsString()
  @IsNotEmpty()
  @MinLength(15)
  @MaxLength(34)
  iban: string;
}
