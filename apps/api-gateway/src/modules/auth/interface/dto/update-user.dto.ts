import { IsOptional, IsIn, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: ['admin', 'viewer'] })
  @IsOptional()
  @IsIn(['admin', 'viewer'])
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
