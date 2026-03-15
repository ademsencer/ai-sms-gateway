import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '@shared/decorators/public.decorator';
import { ApiResponseDto } from '@shared/dto/api-response.dto';
import { AuthService } from '../services/auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyTotpDto } from './dto/verify-totp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with username and password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.login(dto.username, dto.password);

    if ('requiresTwoFactor' in result) {
      return ApiResponseDto.ok(
        { requiresTwoFactor: true, tempToken: result.tempToken },
        'Two-factor authentication required',
      );
    }

    this.setTokenCookies(reply, result.accessToken, result.refreshToken);
    return ApiResponseDto.ok(
      { accessToken: result.accessToken },
      'Login successful',
    );
  }

  @Public()
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP code to complete login' })
  async verifyTotp(
    @Body() dto: VerifyTotpDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const tempToken = dto.tempToken || '';
    const result = await this.authService.verifyTotp(tempToken, dto.code);

    this.setTokenCookies(reply, result.accessToken, result.refreshToken);
    return ApiResponseDto.ok(
      { accessToken: result.accessToken },
      'Two-factor verification successful',
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    // Parse refresh token from cookie header or request body
    let refreshToken: string | undefined;
    const cookieHeader = request.headers['cookie'] as string | undefined;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce(
        (acc, cookie) => {
          const [key, ...valParts] = cookie.trim().split('=');
          if (key) acc[key.trim()] = valParts.join('=').trim();
          return acc;
        },
        {} as Record<string, string>,
      );
      refreshToken = cookies['refresh_token'];
    }
    if (!refreshToken) {
      refreshToken = (request.body as Record<string, string>)?.refreshToken;
    }

    if (!refreshToken) {
      return ApiResponseDto.fail('Missing refresh token');
    }

    const result = await this.authService.refresh(refreshToken);

    reply.header(
      'Set-Cookie',
      this.formatCookie('access_token', result.accessToken, 15 * 60),
    );

    return ApiResponseDto.ok(
      { accessToken: result.accessToken },
      'Token refreshed',
    );
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const user = (request as any).user;
    if (user?.id) {
      await this.authService.logout(user.id);
    }

    // Clear cookies
    reply.header(
      'Set-Cookie',
      this.formatCookie('access_token', '', 0),
    );
    reply.header(
      'Set-Cookie',
      this.formatCookie('refresh_token', '', 0),
    );

    return ApiResponseDto.ok(null, 'Logged out successfully');
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() request: FastifyRequest) {
    const user = (request as any).user;
    const profile = await this.authService.getProfile(user.id);
    return ApiResponseDto.ok(profile);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password' })
  async changePassword(@Req() request: FastifyRequest, @Body() body: { currentPassword: string; newPassword: string }) {
    const user = (request as any).user;
    await this.authService.changePassword(user.id, body.currentPassword, body.newPassword);
    return ApiResponseDto.ok(null, 'Password changed successfully');
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA on own account' })
  async disableOwnTotp(@Req() request: FastifyRequest) {
    const user = (request as any).user;
    const result = await this.authService.disableTotp(user.id);
    return ApiResponseDto.ok(result, '2FA disabled');
  }

  @Post('2fa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate TOTP secret and QR code' })
  async setupTotp(@Req() request: FastifyRequest) {
    const user = (request as any).user;
    const result = await this.authService.setupTotp(user.id);
    return ApiResponseDto.ok(result, 'Scan the QR code with your authenticator app');
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable TOTP after verifying a code' })
  async enableTotp(
    @Req() request: FastifyRequest,
    @Body() dto: VerifyTotpDto,
  ) {
    const user = (request as any).user;
    const result = await this.authService.enableTotp(user.id, dto.code);
    return ApiResponseDto.ok(result, 'Two-factor authentication enabled');
  }

  private setTokenCookies(
    reply: FastifyReply,
    accessToken: string,
    refreshToken: string,
  ) {
    reply.header(
      'Set-Cookie',
      this.formatCookie('access_token', accessToken, 15 * 60),
    );
    reply.header(
      'Set-Cookie',
      this.formatCookie('refresh_token', refreshToken, 7 * 24 * 60 * 60),
    );
  }

  private formatCookie(
    name: string,
    value: string,
    maxAgeSeconds: number,
  ): string {
    const parts = [
      `${name}=${value}`,
      `Max-Age=${maxAgeSeconds}`,
      'Path=/api',
      'HttpOnly',
      'SameSite=Lax',
    ];
    return parts.join('; ');
  }
}
