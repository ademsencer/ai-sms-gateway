export const EXCHANGE_NAMES = {
  SMS_EVENTS: 'sms_events',
  DEVICE_EVENTS: 'device_events',
} as const;

export const QUEUE_NAMES = {
  SMS_PROCESSING: 'sms_processing',
  TELEGRAM_FORWARDING: 'telegram_forwarding',
  DEVICE_TELEGRAM_NOTIFICATIONS: 'device_telegram_notifications',
} as const;

export const ROUTING_KEYS = {
  SMS_RECEIVED: 'sms.received',
  DEVICE_CONNECTED: 'device.connected',
  DEVICE_DISCONNECTED: 'device.disconnected',
  DEVICE_ERROR: 'device.error',
  DEVICE_HEARTBEAT_LOST: 'device.heartbeat_lost',
} as const;

export interface SmsReceivedEvent {
  deviceId: string;
  deviceModel?: string;
  ownerName?: string;
  iban?: string;
  sender: string;
  message: string;
  timestamp: number;
  receivedAt: string;
}

export type DeviceEventType = 'connected' | 'disconnected' | 'error' | 'heartbeat_lost';

export interface DeviceLifecycleEvent {
  deviceId: string;
  deviceName: string;
  ownerName?: string;
  iban?: string;
  eventType: DeviceEventType;
  message?: string;
  occurredAt: string;
}
