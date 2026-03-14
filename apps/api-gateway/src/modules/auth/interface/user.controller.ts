import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '@shared/decorators/roles.decorator';
import { ApiResponseDto } from '@shared/dto/api-response.dto';
import { AuthService } from '../services/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (admin only)' })
  async listUsers() {
    const users = await this.authService.listUsers();
    return ApiResponseDto.ok(users);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.authService.createUser(
      dto.username,
      dto.password,
      dto.role,
    );
    return ApiResponseDto.ok(user, 'User created');
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update user (admin only)' })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.authService.updateUser(id, dto);
    return ApiResponseDto.ok(user, 'User updated');
  }

  @Post(':id/2fa/setup')
  @Roles('admin')
  @ApiOperation({ summary: 'Setup 2FA for a user (admin only)' })
  async setupTotpForUser(@Param('id') id: string) {
    const result = await this.authService.setupTotpForUser(id);
    return ApiResponseDto.ok(result, 'Scan QR code with authenticator app');
  }

  @Post(':id/2fa/disable')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA for a user (admin only)' })
  async disableTotpForUser(@Param('id') id: string) {
    const result = await this.authService.disableTotp(id);
    return ApiResponseDto.ok(result, '2FA disabled');
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  async deleteUser(@Param('id') id: string) {
    await this.authService.deleteUser(id);
    return ApiResponseDto.ok(null, 'User deleted');
  }
}
