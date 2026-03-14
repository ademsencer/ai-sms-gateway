import { Injectable, Logger } from '@nestjs/common';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as qrcode from 'qrcode';

@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);

  async generateSecret(email: string): Promise<{
    secret: string;
    qrCodeDataUrl: string;
    otpauthUrl: string;
  }> {
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      secret,
      issuer: 'SMS-Gateway',
      label: email,
    });
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    this.logger.log(`TOTP secret generated for ${email}`);

    return { secret, qrCodeDataUrl, otpauthUrl };
  }

  verify(secret: string, code: string): boolean {
    const result = verifySync({ token: code, secret });
    return result.valid;
  }
}
