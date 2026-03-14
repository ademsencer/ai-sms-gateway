export { EXCHANGE_NAMES, QUEUE_NAMES, ROUTING_KEYS } from '@sms-gateway/shared-types';

export const CACHE_TTL = {
  DEVICE_INFO: 300,
  SMS_LIST: 60,
} as const;

export const RATE_LIMIT = {
  DEFAULT_TTL: 60,
  DEFAULT_LIMIT: 60,
  SMS_INGEST_TTL: 60,
  SMS_INGEST_LIMIT: 120,
} as const;

export const REDIS_CHANNELS = {
  SMS_REALTIME: 'sms:realtime',
  DEVICE_STATUS: 'device:status',
} as const;
