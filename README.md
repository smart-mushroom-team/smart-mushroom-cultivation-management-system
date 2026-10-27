# Hệ thống quản lý nuôi trồng nấm thông minh – cho thuê khay và giám sát từ xa

Khung dự án (monorepo) theo **SRS v2.4** (`docs/SRS_v2.4.docx`).
Mô hình: một trang trại cung cấp hạ tầng nuôi trồng và giám sát; nhiều hộ dân thuê khay riêng, theo dõi từ xa.

## Kiến trúc

```
Web (React) / Mobile (Flutter) / ESP32 / Camera Agent
                    │
              API Gateway  :8000   (điểm vào duy nhất)
        ┌───────────┼────────────┐
   Identity       Core        Monitoring
   identity_db   core_db     monitoring_db     ← một PostgreSQL, ba database riêng
                    ▲  RabbitMQ  ▲  ──► NiFi ──► monitoring_db.sensor_aggregates
                    │ (cảnh báo)  │ Redis (latest snapshot, lastSeen)
            Core ──► Firebase FCM
Prometheus ──scrape /metrics──► các service ──► Grafana
```

Sơ đồ chi tiết: `docs/diagrams/arch.png`.

> Toàn bộ hệ thống chạy cục bộ bằng Docker Compose (kể cả PostgreSQL, RabbitMQ, Redis, NiFi). Không cần Render, Supabase hay dịch vụ cloud nào.

## Chạy nhanh

```bash
cp .env.example .env            # sửa mật khẩu và khóa
mkdir -p secrets                # đặt firebase-service-account.json vào đây (hoặc để FCM_DRY_RUN=true)
make up                         # = docker compose up -d --build
```

| Thành phần | Địa chỉ |
|---|---|
| API Gateway | http://localhost:8000 (`/health`) |
| Swagger UI (qua Gateway) | http://localhost:8000/api/identity/docs · `/api/core/docs` · `/api/monitoring/docs` |
| Grafana | http://localhost:3000 (dashboard dựng sẵn "Mushroom - Tổng quan") |
| Prometheus | http://localhost:9090 |
| RabbitMQ UI | http://localhost:15672 |
| NiFi | https://localhost:8443/nifi |

PostgreSQL và Redis **không** publish cổng ra ngoài (SRS 2.6). Migration của từng service chạy tự động khi khởi động.

## Cấu trúc thư mục

```
docs/                    SRS, thiết kế CSDL, sơ đồ, ghi chú API
libs/common/             thư viện dùng chung: JWT, log, metrics, lỗi, migrate
services/
  gateway/               định tuyến, JWT sơ bộ, CORS, giới hạn body, chặn /internal
  identity/              đăng ký, đăng nhập, JWT, tạo Operator, vô hiệu hóa
  core/                  phòng/khay, gói, đơn thuê, đợt nuôi, thông báo, Expiry Job, FCM
  monitoring/            thiết bị, snapshot (Redis), số liệu, ngưỡng, cảnh báo, scheduler
infra/                   postgres init, rabbitmq, nifi, prometheus, grafana
devices/
  esp32-firmware/        firmware ESP32 + DHT22 (PlatformIO)
  camera-agent/          Camera Agent (Python)
  simulator/             script giả lập thiết bị (dự phòng, cờ isSimulated)
clients/
  web/                   ReactJS cho Admin/Operator
  mobile/                Flutter cho Customer
scripts/                 seed dữ liệu mẫu, chạy job demo, k6
tests/                   test tích hợp / đồng thời (BR-01)
```

## Quy ước

- Mã FR / UC / BR / NFR trong code, commit và Jira lấy từ SRS (ví dụ `feat(core): FR-12 thuê khay`).
- Mỗi service một database và một tài khoản DB riêng; **không truy vấn chéo**, chỉ tham chiếu bằng ID.
- Migration viết bằng SQL thuần ở `services/<tên>/migrations/NNN_*.sql`; `libs/common/common/migrate.py` áp dụng theo thứ tự và ghi vào bảng `schema_migrations`.
- Nhánh `main` được bảo vệ; mọi thay đổi qua Pull Request, CI chạy lint + test (`.github/workflows/ci.yml`).
- Bí mật (JWT secret, Firebase service account, config firmware) **không commit**; xem `.gitignore`.

## Thứ tự làm đề xuất (SRS mục 8.3, rủi ro)

1. Spike: ESP32 → Gateway → Monitoring → ghi DB (rủi ro mạng, làm ngay tuần đầu).
2. Nghiệp vụ lõi: Identity → Core (thuê khay, đợt nuôi, Expiry Job) → Monitoring (camera, số liệu, ngưỡng).
3. Swagger → RabbitMQ (cảnh báo) → Prometheus/Grafana → Redis → NiFi.
4. Web, Mobile, FCM; demo script (`docs/DEMO.md`).
