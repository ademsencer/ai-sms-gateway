import { SetMetadata } from '@nestjs/common';

export const DEVICE_AUTH_KEY = 'device_auth';

/** Marks an endpoint as requiring device API key authentication via x-device-key header */
export const DeviceAuth = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(DEVICE_AUTH_KEY, true);
