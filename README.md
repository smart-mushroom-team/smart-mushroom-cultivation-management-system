# Smart Mushroom System

Hệ thống quản lý nuôi trồng nấm thông minh tích hợp chức năng **cho thuê** khay nấm và **giám sát từ xa**
(camera snapshot, nhiệt độ/độ ẩm). Tài liệu yêu cầu: [`docs/SRS_v2.1.docx`](docs/SRS_v2.1.docx).

> Trạng thái: **skeleton + OpenAPI nháp + migration `init`**. Hạ tầng, định tuyến, xác thực, phân quyền đã chạy được;
> các controller nghiệp vụ còn là stub trả `501 NOT_IMPLEMENTED`, chờ cài đặt theo từng module.

## Kiến trúc

```
Web (React) ─┐
Mobile (Flutter) ─┼──▶  API Gateway :8080 ──┬──▶ Identity   :3001 ──▶ identity_db
ESP32 / Camera ──┘   (JWT, CORS, routing)   ├──▶ Core       :3002 ──▶ core_db  ──▶ Firebase (FCM)
                                             └──▶ Monitoring :3003 ──▶ monitoring_db
                                                      │   ▲
                                                      └───┘ gọi nội bộ /internal (X-Service-Key)
```

- **SOA / microservice**: 3 service độc lập + API Gateway, mỗi service có **database riêng** (3 database, 3 user,
  trên 1 container PostgreSQL). Service giao tiếp qua REST, không truy vấn chéo database.
- **Xác thực**: Identity ký JWT (HS256); Gateway và các service tự xác thực cục bộ bằng cùng `JWT_SECRET`.
- **Docker**: toàn bộ chạy bằng `docker compose`.
- **Firebase Cloud Messaging**: Core gửi push; lỗi FCM không làm hỏng nghiệp vụ (thông báo luôn lưu DB trước).

| Thành phần | Cổng | Vai trò                                                            |
| ---------- | ---- | ------------------------------------------------------------------ |
| Gateway    | 8080 | Điểm vào duy nhất; chặn `/internal`; kiểm JWT sơ bộ; giới hạn body |
| Identity   | 3001 | Đăng ký, đăng nhập, người dùng, vai trò                            |
| Core       | 3002 | Phòng, khay, gói, đơn thuê, đợt nuôi, thu hoạch, thông báo, FCM    |
| Monitoring | 3003 | Thiết bị, camera snapshot, telemetry, ngưỡng, cảnh báo             |
| PostgreSQL | 5432 | 1 container: `identity_db`, `core_db`, `monitoring_db`             |

Định tuyến qua Gateway:

| Đường dẫn                | Đích       | JWT                                       |
| ------------------------ | ---------- | ----------------------------------------- |
| `/api/identity/**`       | Identity   | Không với `register/login/refresh/logout` |
| `/api/core/**`           | Core       | Có                                        |
| `/api/monitoring/**`     | Monitoring | Có                                        |
| `/iot/**`                | Monitoring | Không (thiết bị dùng `X-Device-Key`)      |
| `/internal/**` (mọi nơi) | —          | Bị chặn, trả 404                          |

## Chạy nhanh

Yêu cầu: Docker + Docker Compose, Node.js >= 20 (để chạy lint/test ngoài Docker).

```bash
cp .env.example .env          # rồi đổi JWT_SECRET, SERVICE_KEY thành chuỗi ngẫu nhiên
docker compose up --build
curl http://localhost:8080/health
```

Xem tài liệu API / dựng mock cho web & mobile:

```bash
docker compose --profile docs up swagger-ui     # http://localhost:8090
docker compose --profile mock up                # Prism mock: 4011 identity, 4012 core, 4013 monitoring
```

Xóa sạch dữ liệu dev (kể cả 3 database): `docker compose down -v`.

## Phát triển cục bộ

```bash
npm install                    # cài toàn bộ workspace
npm run prisma:generate        # sinh Prisma Client cho 3 service
npm run lint && npm run format:check
npm test
npm run openapi:validate
```

Chạy hạ tầng bằng Docker, code Node chạy trên máy (debug dễ hơn):

```bash
docker compose up -d postgres
cp services/core/.env.example services/core/.env      # DATABASE_URL trỏ localhost:5433
npm run dev -w services/core
```

### Cơ sở dữ liệu và migration (Prisma + raw SQL)

Mỗi service có migration `init` (`services/<service>/prisma/migrations/20261011090000_init/`) gồm phần DDL theo
`schema.prisma` và phần **CUSTOM SQL** (CHECK, partial unique index, trigger) thực thi các quy tắc BR-xx ở tầng DB.
ERD, danh sách ràng buộc và khác biệt so với SRS: [`docs/DATABASE.md`](docs/DATABASE.md).

```bash
docker compose up -d postgres
cd services/core && cp .env.example .env
npx prisma migrate dev            # áp dụng init (lần đầu nên thấy "Already in sync")
npx prisma migrate dev --name <mô-tả>    # khi sửa schema.prisma
npx prisma migrate dev --create-only     # sinh SQL để tự thêm CHECK/index/trigger rồi mới áp dụng
```

Container tự chạy `prisma migrate deploy` khi khởi động. **Không sửa migration đã merge**, luôn tạo migration mới.
Test ràng buộc DB chạy trên PostgreSQL thật (PGlite, không cần Docker) cùng với `npm test`.
Tạo tài khoản Admin đầu tiên: `npm run db:seed -w services/identity`.

### Firebase

1. Tạo một Firebase project (một người giữ, cấp quyền cho cả nhóm).
2. Tải **service account JSON** (Project settings → Service accounts) và đặt vào `secrets/firebase-service-account.json`.
   Thư mục `secrets/` đã được `.gitignore`, **không bao giờ commit** file này.
3. Giữ `FCM_DRY_RUN=true` khi chưa có token thật (chỉ validate message). Đặt `false` khi đã có app Flutter đăng ký token.

## Cấu trúc thư mục

```
.
├── gateway/                 API Gateway (không có DB, không có nghiệp vụ)
├── services/
│   ├── identity/  core/  monitoring/
│   │   ├── prisma/          schema.prisma, migrations/
│   │   ├── src/
│   │   │   ├── routes/        định tuyến + phân quyền theo vai trò
│   │   │   ├── controllers/   nhận request, gọi service, trả response
│   │   │   ├── services/      NGHIỆP VỤ (giao dịch, quy tắc BR-xx)
│   │   │   ├── repositories/  truy cập DB (Prisma + raw SQL)
│   │   │   ├── validators/    schema zod cho body/query
│   │   │   ├── middlewares/   middleware riêng của service
│   │   │   ├── jobs/          tiến trình nền (hết hạn đơn, quét thiết bị...)
│   │   │   └── config/        đọc env, Prisma, Firebase
│   │   └── test/
├── libs/shared/             config, logger, lỗi chuẩn, JWT, auth, validate dùng chung
├── docs/
│   ├── SRS_v2.1.docx
│   ├── CONVENTIONS.md       quy ước code + Git (ĐỌC TRƯỚC KHI CODE)
│   ├── DATABASE.md          ERD, ràng buộc DB, khác biệt so với SRS
│   └── openapi/             hợp đồng API (identity, core, monitoring, common)
├── infra/postgres/init/     script tạo 3 database + 3 user
├── scripts/                 tiện ích (kiểm tra OpenAPI)
├── secrets/                 service account Firebase (bị gitignore)
└── docker-compose.yml
```

## Đã có sẵn / việc tiếp theo

**Đã có:** Gateway hoàn chỉnh (định tuyến, JWT sơ bộ, chặn `/internal`, giới hạn body, rate limit, ánh xạ lỗi 502/503/504),
thư viện dùng chung, bảng phân quyền theo vai trò cho **70 endpoint** (khớp 1-1 với OpenAPI, có test),
`roomAccess` (BR-08, fail-closed) có test, `push.service` (FCM, không bao giờ ném lỗi), Prisma schema + **migration `init`**
(19 bảng, ràng buộc nghiệp vụ ở tầng DB có test trên PostgreSQL thật), CI.

**Gợi ý thứ tự cài đặt:**

1. Chạy `prisma migrate dev` kiểm tra migration khớp schema (xem `docs/DATABASE.md` mục 6), cập nhật SRS v2.2.
2. **Identity**: register → login → refresh/logout → `/me` → `/users`, seed Admin.
3. **Core**: phòng/khay/gói → thuê khay (BR-01, test đồng thời) → xác nhận/từ chối → đợt nuôi → thu hoạch
   → thông báo + FCM → job hết hạn + chế độ demo → dashboard.
4. **Monitoring**: thiết bị + `deviceAuth` → telemetry + ngưỡng → snapshot → scheduler offline → retention.
5. Mock IoT bằng script `curl`/Node để test Monitoring (không cần Wokwi lúc này).

Quy ước code và Git: xem [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md).
