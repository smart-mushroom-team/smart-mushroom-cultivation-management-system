# Cơ sở dữ liệu

Một PostgreSQL (container), ba database độc lập: `identity_db`, `core_db`, `monitoring_db`. Mỗi service một user riêng;
`nifi_user` chỉ ghi `monitoring_db.sensor_aggregates`. Không truy vấn chéo DB; liên kết bằng uuid (BR-16).
Schema nằm ở `services/*/migrations/NNN_*.sql`, tự chạy khi service khởi động (`common.migrate`).
Thêm thay đổi bằng file mới `002_*.sql`, không sửa file đã chạy.
