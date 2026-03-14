import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@infrastructure/database';
import { TotpService } from './totp.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly totpService: TotpService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.enabled) {
      throw new UnauthorizedException('Account is disabled');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.totpEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, twoFactorPending: true },
        {
          secret: this.configService.get<string>('jwt.accessSecret'),
          expiresIn: '5m' as any,
        },
      );
      return { requiresTwoFactor: true, tempToken };
    }

    return this.issueTokens(user.id, user.username, user.role);
  }

  async verifyTotp(tempToken: string, code: string) {
    let payload: { sub: string; twoFactorPending?: boolean };
    try {
      payload = this.jwtService.verify(tempToken, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired temp token');
    }

    if (!payload.twoFactorPending) {
      throw new UnauthorizedException('Invalid temp token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.totpSecret) {
      throw new UnauthorizedException('User not found or TOTP not configured');
    }

    const isValid = this.totpService.verify(user.totpSecret, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    return this.issueTokens(user.id, user.username, user.role);
  }

  async issueTokens(userId: string, username: string, role: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId, username, role },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn') as any,
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') as any,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });

    this.logger.log(`Tokens issued for user ${username}`);

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; type?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('User not found or logged out');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, username: user.username, role: user.role },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn') as any,
      },
    );

    return { accessToken };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    this.logger.log(`User ${userId} logged out`);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        enabled: true,
        totpEnabled: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createUser(username: string, password: string, role: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { username, passwordHash, role },
      select: { id: true, username: true, role: true, createdAt: true },
    });

    this.logger.log(`User created: ${username}`);
    return user;
  }

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        enabled: true,
        totpEnabled: true,
        createdAt: true,
      },
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id: userId } });
    this.logger.log(`User deleted: ${user.username}`);
  }

  async updateUser(userId: string, data: { role?: string; enabled?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, role: true, enabled: true, totpEnabled: true, createdAt: true },
    });
    this.logger.log(`User updated: ${updated.username}`);
    return updated;
  }

  async setupTotp(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { secret, qrCodeDataUrl, otpauthUrl } =
      await this.totpService.generateSecret(user.username);

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret },
    });

    return { qrCodeDataUrl, otpauthUrl };
  }

  async setupTotpForUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const { secret, qrCodeDataUrl, otpauthUrl } = await this.totpService.generateSecret(user.username);
    await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });
    return { secret, qrCodeDataUrl, otpauthUrl };
  }

  async disableTotp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id: userId }, data: { totpEnabled: false, totpSecret: null } });
    this.logger.log(`TOTP disabled for user ${user.username}`);
    return { totpEnabled: false };
  }

  async enableTotp(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.totpSecret) {
      throw new NotFoundException('User not found or TOTP not set up');
    }

    const isValid = this.totpService.verify(user.totpSecret, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true },
    });

    this.logger.log(`TOTP enabled for user ${user.username}`);
    return { totpEnabled: true };
  }
}
