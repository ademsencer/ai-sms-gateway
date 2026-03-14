import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'changeme' })
  @IsString()
  @MinLength(6)
  password: string;
}
