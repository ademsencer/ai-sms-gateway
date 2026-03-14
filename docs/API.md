# API Reference

Base URL: `http://localhost:3000/api`

Swagger UI: `http://localhost:3000/api/docs`

## Authentication

Device endpoints use the `x-device-key` header for authentication. Get an API key by registering a device.

## Endpoints

### POST /api/device/register

Register a new Android device. **Public endpoint**.

**Request:**
```json
{
  "deviceId": "device_001",
  "name": "Samsung Galaxy S24"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "deviceId": "device_001",
    "name": "Samsung Galaxy S24",
    "apiKey": "uuid-api-key-here"
  },
  "message": "Device registered successfully. Store the API key securely.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/sms

Ingest an SMS message. **Requires `x-device-key` header**.

**Headers:**
```
x-device-key: your-device-api-key
Content-Type: application/json
```

**Request:**
```json
{
  "deviceId": "device_001",
  "sender": "+447777888999",
  "message": "OTP code 728192",
  "timestamp": 1712345678
}
```

**Response (202):**
```json
{
  "success": true,
  "data": { "queued": true },
  "message": "SMS accepted for processing",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/device/

List all registered devices. **Public endpoint**.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "deviceId": "device_001",
      "name": "Samsung Galaxy S24",
      "status": "online",
      "lastSeen": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/sms

List SMS messages with pagination. **Public endpoint**.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50, max: 100)
- `deviceId` (optional filter)

### GET /api/stats

Dashboard statistics. **Public endpoint**.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSms": 1542,
    "totalDevices": 15,
    "onlineDevices": 12,
    "smsLastMinute": 3
  }
}
```

### GET /api/health

Health check endpoint. **Public endpoint**.

## Rate Limits

- SMS ingestion: 120 requests/minute per IP
- Other endpoints: 60 requests/minute per IP

Response headers:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## WebSocket Events

Connect to `/events` namespace via Socket.io.

Events:
- `sms:received` — New SMS processed
- `device:status` — Device online/offline change
- `stats:update` — Dashboard stats update
