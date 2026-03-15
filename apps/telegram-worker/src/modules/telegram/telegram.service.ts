import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.botToken', '');
    this.chatId = this.configService.get<string>('telegram.chatId', '');
    this.enabled = this.configService.get<boolean>('telegram.enabled', false);
  }

  async sendMessage(params: {
    deviceId: string;
    sender: string;
    message: string;
    ownerName?: string;
    iban?: string;
  }): Promise<void> {
    const { deviceId, sender, message, ownerName, iban } = params;

    if (!this.enabled) {
      this.logger.debug('Telegram forwarding disabled, skipping');
      return;
    }

    if (!this.botToken || !this.chatId) {
      this.logger.warn('Telegram bot token or chat ID not configured');
      return;
    }

    const text = [
      '\u{1F4E9} *SMS RECEIVED*',
      '',
      `*Name:* ${this.escapeMarkdown(ownerName || 'Unknown')}`,
      `*IBAN:* ${this.escapeMarkdown(iban || 'N/A')}`,
      `*Device ID:* \`${deviceId}\``,
      `*From:* \`${sender}\``,
      `*Time:* ${this.formatTurkeyTime(new Date())}`,
      '',
      `*Message:* ${this.escapeMarkdown(message)}`,
    ].join('\n');

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Telegram API error: ${response.status} — ${body}`);
      } else {
        this.logger.log(`Telegram message sent for device ${deviceId}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Telegram send failed: ${err.message}`);
    }
  }

  async sendDeviceNotification(event: {
    deviceId: string;
    deviceName: string;
    eventType: string;
    message?: string;
    occurredAt: string;
    ownerName?: string;
    iban?: string;
  }): Promise<void> {
    if (!this.enabled) return;
    if (!this.botToken || !this.chatId) return;

    const emoji: Record<string, string> = {
      connected: '\u{1F7E2}',
      disconnected: '\u{1F534}',
      error: '\u{26A0}\u{FE0F}',
      heartbeat_lost: '\u{1F494}',
    };

    const titles: Record<string, string> = {
      connected: 'DEVICE CONNECTED',
      disconnected: 'DEVICE DISCONNECTED',
      error: 'DEVICE ERROR',
      heartbeat_lost: 'HEARTBEAT LOST',
    };

    const icon = emoji[event.eventType] || '\u{2139}\u{FE0F}';
    const title = titles[event.eventType] || event.eventType.toUpperCase();

    const lines = [
      `${icon} *${title}*`,
      '',
      `*Name:* ${this.escapeMarkdown(event.ownerName || event.deviceName)}`,
      `*IBAN:* ${this.escapeMarkdown(event.iban || 'N/A')}`,
      `*Device ID:* \`${event.deviceId}\``,
      `*Time:* ${this.formatTurkeyTime(new Date(event.occurredAt))}`,
    ];

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: lines.join('\n'),
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Telegram device notification error: ${response.status} — ${body}`);
      } else {
        this.logger.log(`Device notification sent: ${event.deviceId} — ${event.eventType}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Telegram device notification failed: ${err.message}`);
    }
  }

  private formatTurkeyTime(date: Date): string {
    return date.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }
}
