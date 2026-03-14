import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IngestSmsDto {
  /** Device identifier */
  @ApiProperty({ example: 'device_001', description: 'Device that received the SMS' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  /** SMS sender phone number */
  @ApiProperty({ example: '+447777888999', description: 'Sender phone number' })
  @IsString()
  @IsNotEmpty()
  sender: string;

  /** SMS message content */
  @ApiProperty({ example: 'OTP code 728192', description: 'SMS message body' })
  @IsString()
  @IsNotEmpty()
  message: string;

  /** Unix timestamp when SMS was received on device */
  @ApiProperty({ example: 1712345678, description: 'Unix timestamp of SMS reception' })
  @IsNumber()
  timestamp: number;
}
