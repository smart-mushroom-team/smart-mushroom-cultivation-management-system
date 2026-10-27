# Sự kiện RabbitMQ

| Queue | Producer → Consumer | Nội dung |
|---|---|---|
| `alerts.events` | Monitoring → Core | `type, title, content, roomId, deviceId, dedupeKey` |
| `telemetry.events` | Monitoring → NiFi | `roomId, deviceId, temperature, humidity, recordedAt` |

Durable, publish có confirm, thử lại 3 lần rồi ghi log và bỏ. Core ack sau khi lưu thông báo; `dedupeKey` chống trùng.
