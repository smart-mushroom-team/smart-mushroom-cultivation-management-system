# Kịch bản demo gợi ý

1. `cp .env.example .env` → sửa mật khẩu, `DEMO_MODE=true` → `make up`.
2. `make seed` tạo phòng, khay, gói. Đăng ký Customer, thuê 2 khay (Swagger tại `/api/core/docs`).
3. `make simulate` tạo thiết bị mô phỏng cho mọi phòng và gửi số đo; xem Grafana (:3000) và biểu đồ.
4. `make simulate ARGS="--anomaly"` → 3 lần liên tiếp vượt ngưỡng → thông báo (FCM dry-run ghi log).
5. `python scripts/demo_run_expiry.py <ngày sau hạn>` → đơn EXPIRED; thu hoạch khay → COMPLETED, khay AVAILABLE.

## Giả lập thiết bị (`devices/simulator/simulate_devices.py`)

Simulator gọi đúng API mà ESP32 / camera agent gọi (`X-Device-Key`), nên chạy song song với thiết bị thật được.
Cài: `pip install -r devices/simulator/requirements.txt` (Pillow tuỳ chọn, để ảnh có chữ).

| Muốn | Lệnh |
|---|---|
| Tự tạo thiết bị cho mọi phòng (đổi khóa của thiết bị *mô phỏng*, không đụng thiết bị thật) | `python devices/simulator/simulate_devices.py --email admin@x.com --all-rooms` |
| Chỉ một phòng, thêm camera | `... --email admin@x.com --room <id> --with-camera` |
| Dùng khóa thiết bị đã có | `... --sensor=mk_xxx --camera=mk_yyy` |
| Chu kỳ 2 giây | `--interval 2` (camera: `--camera-interval 10`) |
| Vượt ngưỡng nhiệt độ | `--anomaly` (= `--profile hot`) |
| Profile khác | `--profile cold` / `dry` / `humid` / `flaky` / `dropout` |
| Profile riêng cho từng khóa | `--sensor=KEY1:hot --sensor=KEY2:dry` |
| Thử thiết bị offline rồi online lại | `--profile dropout --dropout-on 30 --dropout-off 60` |
| Thỉnh thoảng gửi dữ liệu sai (server phải trả 422) | `--bad-rate 0.1` |
| Dừng sau N lần mỗi thiết bị / sau N giây | `--count 20` / `--duration 120` |

Mật khẩu đọc từ `SIM_PASSWORD` hoặc hỏi lúc chạy. Dừng bằng Ctrl+C, cuối cùng in tổng kết `ok/rejected/skipped/errors`.
Khi ESP32 thật tới: gắn khóa thiết bị thật vào firmware, tắt simulator của phòng đó (hoặc để chạy cho phòng khác).
