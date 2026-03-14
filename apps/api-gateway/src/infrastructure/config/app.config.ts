import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.API_PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'mysql://smsgateway:smsgateway_password@localhost:3306/sms_gateway_db',
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'smsgw:',
}));

export const rabbitmqConfig = registerAs('rabbitmq', () => ({
  url: process.env.RABBITMQ_URL || 'amqp://smsgateway:smsgateway_password@localhost:5672',
}));

export const telegramConfig = registerAs('telegram', () => ({
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID || '',
  enabled: process.env.TELEGRAM_ENABLED === 'true',
}));

export const deviceConfig = registerAs('device', () => ({
  heartbeatTtl: parseInt(process.env.DEVICE_HEARTBEAT_TTL || '120', 10),
  heartbeatCheckInterval: parseInt(process.env.DEVICE_HEARTBEAT_CHECK_INTERVAL || '30000', 10),
  smsDedupTtl: parseInt(process.env.SMS_DEDUP_TTL || '300', 10),
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || 'change-me-access',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
}));
