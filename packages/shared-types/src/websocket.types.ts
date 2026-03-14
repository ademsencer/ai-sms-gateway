export const WS_EVENTS = {
  SMS_RECEIVED: 'sms:received',
  DEVICE_STATUS: 'device:status',
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

export interface WsStatsUpdate {
  totalSms: number;
  onlineDevices: number;
  smsPerMinute: number;
}
