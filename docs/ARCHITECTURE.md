# Architecture

## System Overview

The SMS Gateway Platform uses an event-driven microservice architecture designed to handle 1000+ concurrent Android devices.

## Data Flow

1. **Android device** receives SMS via `SMS_RECEIVED` broadcast
2. Device sends `POST /api/sms` to **API Gateway** with device key
3. API Gateway validates, deduplicates (Redis), publishes `sms.received` to **RabbitMQ**
4. **SMS Worker** consumes from `sms_processing` queue, detects OTP, stores in **MySQL**
5. SMS Worker publishes to Redis pub/sub `sms:realtime` channel
6. **API Gateway WebSocket** relays to connected **Dashboard** clients
7. **Telegram Worker** consumes from `telegram_forwarding` queue, sends to Telegram Bot API
8. **Device Monitor** checks Redis heartbeats every 30s, marks stale devices offline

## RabbitMQ Topology

```
Exchange: sms_events (topic)
  |
  |--- routing key: sms.received ---> Queue: sms_processing
  |--- routing key: sms.received ---> Queue: telegram_forwarding
```

Both queues bind to the same routing key. Every SMS event is delivered to both workers.

## Redis Usage

| Key Pattern | Purpose | TTL |
|---|---|---|
| `device:heartbeat:{deviceId}` | Device liveness tracking | 120s |
| `sms:dedup:{sha256}` | SMS deduplication | 300s |
| `ratelimit:{ip}:{path}` | API rate limiting | 60s |
| Channel: `sms:realtime` | Cross-process WebSocket bridge | - |
| Channel: `device:status` | Device status change events | - |

## Database Schema

### devices
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| device_id | VARCHAR | Unique device identifier |
| name | VARCHAR | Display name |
| api_key_hash | VARCHAR | bcrypt hash of API key |
| status | VARCHAR | online/offline |
| last_seen | DATETIME | Last heartbeat |
| created_at | DATETIME | Registration time |

### sms_messages
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| device_id | VARCHAR | FK to devices |
| sender | VARCHAR | Phone number |
| message | TEXT | SMS body |
| timestamp | BIGINT | Unix timestamp |
| otp_code | VARCHAR | Detected OTP (nullable) |
| created_at | DATETIME | Processing time |

## Service Communication

```
API Gateway <--HTTP--> Android Devices
API Gateway --AMQP--> RabbitMQ --AMQP--> Workers
SMS Worker --Redis pub/sub--> API Gateway --WebSocket--> Dashboard
Device Monitor --Redis pub/sub--> API Gateway --WebSocket--> Dashboard
```
