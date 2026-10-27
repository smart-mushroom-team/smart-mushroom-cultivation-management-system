Hai hàng đợi bền (khai báo bởi code khi khởi động, `declare` idempotent):

| Hàng đợi | Người gửi | Người nhận | Nội dung |
|---|---|---|---|
| `alerts.events` | Monitoring | Core | thiết bị offline, vượt ngưỡng (có `dedupeKey`) – FR-52 |
| `telemetry.events` | Monitoring | NiFi | số liệu cảm biến đã chấp nhận – FR-53 |

Thông điệp mẫu: `docs/api/events.md`.
