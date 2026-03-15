import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SmsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by device ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Filter by owner name (partial match)' })
  @IsOptional()
  @IsString()
  ownerName?: string;

  @ApiPropertyOptional({ description: 'Filter by IBAN (partial match)' })
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiPropertyOptional({ description: 'Search in sender or message text' })
  @IsOptional()
  @IsString()
  search?: string;
}
