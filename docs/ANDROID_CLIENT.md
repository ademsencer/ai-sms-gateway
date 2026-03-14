# Android Client Setup

## Prerequisites

- Android Studio (latest)
- Android device with SIM card (SMS permissions don't work on emulators for real SMS)
- API Gateway running and accessible from the device

## Build

1. Open `apps/android-client` in Android Studio
2. Sync Gradle
3. Build > Generate Signed APK (or Run on connected device)

## Configuration

1. Register your device via API:
```bash
curl -X POST http://YOUR_SERVER:3000/api/device/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "my_phone_001", "name": "My Samsung"}'
```

2. Note the returned `apiKey`

3. In the Android app:
   - **API URL**: `http://YOUR_SERVER:3000` (use your server's IP, not localhost)
   - **Device ID**: `my_phone_001` (must match what you registered)
   - **API Key**: The key from step 2

4. Tap **Save Configuration**
5. Tap **Start**

## Permissions

The app requires:
- `RECEIVE_SMS` — Listen for incoming SMS
- `READ_SMS` — Read SMS content
- `INTERNET` — Send data to the gateway
- `FOREGROUND_SERVICE` — Keep the service running
- `RECEIVE_BOOT_COMPLETED` — Auto-restart after reboot

Grant all permissions when prompted.

## Features

- **Background service**: Runs as a foreground service with notification
- **Auto-restart on boot**: Automatically starts after device reboot
- **Network retry queue**: Failed messages are queued and retried with exponential backoff
- **OTP detection**: OTPs are detected server-side by the SMS worker

## Troubleshooting

- **SMS not forwarding**: Check permissions in Settings > Apps > SMS Gateway
- **Network errors**: Ensure the server IP is reachable from the device (not `localhost`)
- **Service stops**: Check battery optimization settings, disable for SMS Gateway
- **Duplicate messages**: The server handles deduplication automatically

## Testing

1. Install APK on device
2. Configure with server details
3. Start the service
4. Send an SMS to the device from another phone
5. Check the dashboard for the message
6. Check Telegram for the forwarded message (if enabled)
