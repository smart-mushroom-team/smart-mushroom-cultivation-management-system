# Sự kiện RabbitMQ

| Queue | Producer → Consumer | Nội dung |
|---|---|---|
| `alerts.events` | Monitoring → Core | `type, title, content, roomId, deviceId, dedupeKey` |
| `telemetry.events` | Monitoring → NiFi | `roomId, deviceId, temperature, humidity, recordedAt` |

Durable, publish có confirm, thử lại 3 lần rồi ghi log và bỏ. Core ack sau khi lưu thông báo; `dedupeKey` chống trùng.

## Các loại cảnh báo trong `alerts.events`

| `type` | Khi nào | Ghi chú |
|---|---|---|
| `TEMP_OUT_OF_RANGE`, `HUMIDITY_OUT_OF_RANGE` | N lần đo liên tiếp (mặc định 3) ngoài khoảng min-max của phòng | Báo một lần cho mỗi đợt; đổi ngưỡng thì đếm lại |
| `DEVICE_OFFLINE` | Quá 3 x chu kỳ gửi không có dữ liệu | Một lần cho mỗi lần mất kết nối; thiết bị chưa gửi lần nào không bị báo |
| `DEVICE_ONLINE` | Có dữ liệu trở lại sau khi đã báo offline | Một lần |

Mọi sự kiện có `type, title, content, roomId, deviceId, dedupeKey`. Core lưu cho vai trò STAFF (Operator + Admin).
Monitoring chỉ gửi **sau khi** giao dịch lưu dữ liệu đã commit; gửi lỗi thì thử lại ở lần đo/lần chạy job kế tiếp.
