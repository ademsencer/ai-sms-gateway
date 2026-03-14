export type UserRole = 'admin' | 'viewer';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  requiresTwoFactor: boolean;
  tempToken?: string;
  user?: {
    id: string;
    username: string;
    role: UserRole;
    totpEnabled: boolean;
  };
}

export interface Setup2faResponse {
  secret: string;
  qrCodeDataUrl: string;
  otpauthUrl: string;
}

export interface Verify2faRequest {
  code: string;
  tempToken?: string;
}

export interface UserResponse {
  id: string;
  username: string;
  role: UserRole;
  totpEnabled: boolean;
  enabled: boolean;
  createdAt: string;
}
