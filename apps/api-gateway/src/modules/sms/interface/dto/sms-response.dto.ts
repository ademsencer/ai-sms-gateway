import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SmsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  deviceId: string;

  @ApiProperty()
  sender: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  timestamp: number;

  @ApiPropertyOptional()
  otpCode: string | null;

  @ApiProperty()
  createdAt: string;
}
