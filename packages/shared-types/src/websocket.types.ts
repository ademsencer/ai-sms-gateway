export const WS_EVENTS = {
  SMS_RECEIVED: 'sms:received',
  DEVICE_STATUS: 'device:status',
  DEVICE_REGISTERED: 'device:registered',
  STATS_UPDATE: 'stats:update',
} as const;

export interface WsSmsReceived {
  id: string;
  deviceId: string;
  sender: string;
  message: string;
  otpCode: string | null;
  timestamp: number;
  createdAt: string;
}

export interface WsDeviceStatus {
  deviceId: string;
  status: 'online' | 'offline';
  lastSeen: string;
}

export interface WsDeviceRegistered {
  deviceId: string;
  ownerName: string;
  iban: string;
  model: string;
  status: string;
  createdAt: string;
}

export interface WsStatsUpdate {
  totalSms: number;
  onlineDevices: number;
  smsPerMinute: number;
}
