# SMS Gateway Enterprise Platform

Enterprise-grade Android SMS Gateway Platform that collects SMS messages from multiple Android devices and processes them using a scalable event-driven microservice architecture.

## Architecture

```
Android Devices
      |
      v (POST /api/sms)
+------------------+
|   API Gateway    |---> Swagger UI (/api/docs)
|   (NestJS)       |
+--------+---------+
         |
         v (sms.received)
+--------+---------+
| RabbitMQ Exchange |
|   (sms_events)   |
+--+------------+--+
   |            |
   v            v
+------+  +----------+
| SMS  |  | Telegram |
|Worker|  |  Worker  |
+--+---+  +----+-----+
   |           |
   v           v
MySQL      Telegram Bot
   |
   v (Redis pub/sub)
+----------+
| Dashboard|  <--- Socket.io (realtime)
| (Vue 3)  |
+----------+
```

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Backend        | NestJS, TypeScript, Fastify          |
| Message Queue  | RabbitMQ                            |
| Cache          | Redis                               |
| Database       | MySQL 8.0 (Prisma ORM)              |
| Realtime       | Socket.io                           |
| API Docs       | Swagger / OpenAPI                   |
| Frontend       | Vue 3, Vite, TailwindCSS, Pinia     |
| Android        | Kotlin, Retrofit, Room              |
| Infrastructure | Docker, Docker Compose, Nginx       |

## Services

| Service               | Description                                     |
|-----------------------|-------------------------------------------------|
| `api-gateway`         | REST API, device auth, SMS ingestion, WebSocket  |
| `sms-worker`          | Processes SMS, detects OTP, stores in MySQL       |
| `telegram-worker`     | Forwards SMS to Telegram Bot                     |
| `device-monitor-worker` | Monitors device heartbeats, marks offline      |
| `dashboard`           | Realtime Vue 3 dashboard                         |
| `android-client`      | Kotlin Android app for SMS forwarding            |

## Quick Start

### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env with your settings
```

### 2. Start with Docker

```bash
docker compose up --build -d
```

### 3. Access services

- **Dashboard**: http://localhost
- **API**: http://localhost/api
- **Swagger**: http://localhost/api/docs
- **RabbitMQ Management**: http://localhost:15672 (smsgateway/smsgateway_password)

### 4. Register a device

```bash
curl -X POST http://localhost/api/device/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "device_001", "name": "My Phone"}'
```

Save the returned `apiKey`.

### 5. Send a test SMS

```bash
curl -X POST http://localhost/api/sms \
  -H "Content-Type: application/json" \
  -H "x-device-key: YOUR_API_KEY" \
  -d '{
    "deviceId": "device_001",
    "sender": "+447777888999",
    "message": "Your OTP code is 728192",
    "timestamp": 1712345678
  }'
```

## Development

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Local development

```bash
pnpm install

# Start infrastructure
docker compose up -d mysql redis rabbitmq

# Run database migrations
cd apps/api-gateway && pnpm prisma:migrate && cd ../..

# Start services (in separate terminals)
pnpm dev:gateway
pnpm dev:sms-worker
pnpm dev:telegram-worker
pnpm dev:device-monitor
pnpm dev:dashboard
```

## Telegram Setup

1. Create a bot via @BotFather on Telegram
2. Get the bot token
3. Get your chat ID (send a message to the bot, then check the API)
4. Set in `.env`:

```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
TELEGRAM_ENABLED=true
```

## Android Setup

1. Open `apps/android-client` in Android Studio
2. Build the APK
3. Install on your Android device
4. Grant SMS permissions
5. Configure: API URL, Device ID, API Key
6. Start the service

See [docs/ANDROID_CLIENT.md](docs/ANDROID_CLIENT.md) for details.

## Documentation

- [API Reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Android Client](docs/ANDROID_CLIENT.md)
