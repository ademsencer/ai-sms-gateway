import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeviceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  deviceId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  androidVersion?: string;

  @ApiPropertyOptional()
  model?: string;

  @ApiPropertyOptional()
  serialNumber?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  lastSeen: string;

  @ApiProperty()
  createdAt: string;
}

export class RegisterDeviceResponseDto {
  @ApiProperty()
  deviceId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'API key for device authentication. Store this securely — it cannot be retrieved again.' })
  apiKey: string;
}
