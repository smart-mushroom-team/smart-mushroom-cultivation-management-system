# Luồng NiFi (FR-53) – một luồng duy nhất

```
ConsumeAMQP (telemetry.events)
  → EvaluateJsonPath / ConvertRecord (chuẩn hóa JSON → record)
  → MergeRecord hoặc QueryRecord (gộp cửa sổ 5 phút theo roomId: avg/min/max/count)
  → PutDatabaseRecord (UPSERT vào monitoring_db.sensor_aggregates, khóa (room_id, window_start))
```

Thiết lập:

1. Tải `postgresql-42.x.jar` đặt vào `infra/nifi/drivers/`.
2. Mở https://localhost:8443/nifi, đăng nhập bằng `NIFI_USER` / `NIFI_PASSWORD`.
3. Tạo `DBCPConnectionPool`: `jdbc:postgresql://postgres:5432/monitoring_db`, user `nifi_user`.
4. Tạo `AMQPConnection` hoặc điền broker `rabbitmq:5672`, user/mật khẩu RabbitMQ trong `ConsumeAMQP`.
5. Dựng luồng như trên, xuất **Download flow definition** vào `infra/nifi/exports/` (tên `telemetry-aggregate.json`) và commit
   (NFR-16 yêu cầu luồng "được nạp sẵn": import tệp này khi khởi động hoặc dùng NiFi Registry/`nifi-toolkit` – chọn khi làm).

Ghi chú: NiFi **không** nằm trên đường nhận dữ liệu thiết bị; NiFi ngừng thì số liệu thô vẫn được lưu (NFR-22).
