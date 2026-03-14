export interface SmsPayload {
  deviceId: string;
  sender: string;
  message: string;
  timestamp: number;
}

export interface SmsMessage {
  id: string;
  deviceId: string;
  sender: string;
  message: string;
  timestamp: number;
  otpCode: string | null;
  createdAt: string;
}

export interface SmsQueryParams {
  page?: number;
  limit?: number;
  deviceId?: string;
  sender?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
