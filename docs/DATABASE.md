# Cơ sở dữ liệu

Một PostgreSQL (container), ba database độc lập: `identity_db`, `core_db`, `monitoring_db`. Mỗi service một user riêng;
`nifi_user` chỉ ghi `monitoring_db.sensor_aggregates`. Không truy vấn chéo DB; liên kết bằng uuid (BR-16).
Schema nằm ở `services/*/migrations/NNN_*.sql`, tự chạy khi service khởi động (`common.migrate`).
Thêm thay đổi bằng file mới `002_*.sql`, không sửa file đã chạy.

## Ảnh camera (lịch sử)

Ảnh JPEG **không** lưu trong PostgreSQL. File nằm trong Docker volume `snapshots` (`/data/snapshots/<room_id>/<snapshot_id>.jpg`),
PostgreSQL (`monitoring_db.camera_snapshots`) chỉ giữ metadata: `id, device_id, room_id, image_path, size_bytes, captured_at, created_at`.

* `captured_at` là lúc camera chụp (header `X-Captured-At`, mặc định bằng lúc nhận); `created_at` là lúc backend nhận.
* Job `snapshot_retention` chạy mỗi 30 phút, xóa ảnh cũ hơn `SNAPSHOT_RETENTION_HOURS` (mặc định 24 giờ) và file mồ côi.
* Khách chỉ xem ảnh chụp từ **ngày bắt đầu đơn thuê** của mình (BR-08); Operator/Admin xem toàn bộ.
* Sao lưu ảnh: sao lưu volume `snapshots` (không nằm trong dump của PostgreSQL).
