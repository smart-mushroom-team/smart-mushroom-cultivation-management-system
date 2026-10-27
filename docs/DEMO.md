# Kịch bản demo gợi ý

1. `cp .env.example .env` → sửa mật khẩu, `DEMO_MODE=true` → `make up`.
2. `make seed` tạo phòng, khay, gói. Đăng ký Customer, thuê 2 khay (Swagger tại `/api/core/docs`).
3. Tạo thiết bị cảm biến (Operator), chạy `devices/simulator/simulate_devices.py`; xem Grafana (:3000) và biểu đồ.
4. Chạy với `--anomaly` → 3 lần liên tiếp vượt ngưỡng → thông báo (FCM dry-run ghi log).
5. `python scripts/demo_run_expiry.py <ngày sau hạn>` → đơn EXPIRED; thu hoạch khay → COMPLETED, khay AVAILABLE.
