export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export interface RegisterDevicePayload {
  deviceId: string;
  name: string;
}

export interface RegisterDeviceResponse {
  deviceId: string;
  name: string;
  apiKey: string;
}

export interface DeviceResponse {
  id: string;
  deviceId: string;
  name: string;
  status: DeviceStatus;
  lastSeen: string;
  createdAt: string;
}

export interface DeviceHeartbeat {
  deviceId: string;
  timestamp: number;
}
