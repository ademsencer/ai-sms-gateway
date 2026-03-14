import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './services/auth.service';
import { TotpService } from './services/totp.service';
import { AuthController } from './interface/auth.controller';
import { UserController } from './interface/user.controller';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.accessExpiresIn') as any,
        },
      }),
    }),
  ],
  providers: [AuthService, TotpService],
  controllers: [AuthController, UserController],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
