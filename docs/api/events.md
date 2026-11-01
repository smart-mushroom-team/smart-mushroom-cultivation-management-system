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

## Core xử lý tin thế nào (consumer `alerts.events`)

1. Kiểm tra hợp đồng (`type`, `title`, `dedupeKey` là chuỗi không rỗng). Tin hỏng không thử lại, chuyển thẳng sang hàng đợi lỗi.
2. Lưu thông báo cho STAFF trong một giao dịch (`ON CONFLICT (dedupe_key) DO NOTHING`). Chỉ khi thông báo mới thì mới push FCM,
   nên tin giao lại không push lần hai.
3. Lỗi tạm thời (ví dụ DB bận): thử tối đa 4 lần, chờ 1s, 2s, 4s. Vẫn lỗi thì chuyển sang hàng đợi lỗi.
4. Chỉ `ack` sau khi tin đã được lưu hoặc đã nằm an toàn trong hàng đợi lỗi (publish có confirm). Mất kết nối giữa chừng thì
   RabbitMQ giao lại; consumer tự kết nối lại sau 5 giây.

**Hàng đợi lỗi** `alerts.events.dead` (xem ở giao diện RabbitMQ :15672, header `reason` và `failedAt`). Sau khi sửa nguyên nhân:

```bash
docker compose exec core python -m app.replay            # đẩy lại tất cả về alerts.events
docker compose exec core python -m app.replay --max 10   # chỉ 10 tin
docker compose exec core python -m app.replay --discard  # bỏ hẳn (tin hỏng thật sự)
```

Đẩy lại tin đã xử lý rồi vẫn an toàn nhờ `dedupeKey`.

