# Web quản trị (React + Vite + TypeScript)

Dành cho **Operator** và **Admin**. Khách thuê khay dùng ứng dụng di động (`clients/mobile`); tài khoản khách đăng nhập ở đây sẽ bị từ chối
kèm lời nhắc dùng ứng dụng.

Thư viện: React Router (định tuyến), TanStack Query (gọi và lưu đệm API), Tailwind CSS 4 (giao diện), Recharts (biểu đồ, dùng từ bước 5b).
Font Bricolage Grotesque và Public Sans được đóng gói sẵn (không tải từ internet), có đủ dấu tiếng Việt.

## Chạy khi phát triển

```bash
make up            # dựng backend (cần Docker)
make web-install   # lần đầu: npm ci
make web-dev       # http://localhost:5173
```

Vite chuyển tiếp mọi đường dẫn `/api/...` tới API Gateway nên trình duyệt không gặp vấn đề CORS. Gateway ở địa chỉ khác thì đặt
`VITE_PROXY_TARGET=http://host:cổng`. Muốn web gọi thẳng một địa chỉ API (không qua proxy) thì đặt `VITE_API_URL` (khi đó Gateway phải cho phép
nguồn đó trong `CORS_ORIGINS`).

Đăng nhập bằng tài khoản Admin seed (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` trong `.env`). Admin tạo Operator ở bước 5f, hoặc tạm thời
qua Swagger: `POST /api/identity/users/operators`.

## Kiểm thử

```bash
make web-test      # kiểm kiểu + 71 test đơn vị (Vitest, Testing Library)
make ui-test       # test giao diện bằng trình duyệt thật (Playwright) trên stack đang chạy; cần make up và make web-dev
```

Lần đầu chạy `make ui-test`: `pip install playwright pytest requests pillow && playwright install chromium`.
Test giám sát (`tests/ui/test_web_monitoring.py`) tự tạo phòng, thiết bị, số đo và ảnh qua Gateway (`E2E_BASE_URL`, mặc định http://localhost:8000);
biểu đồ cần NiFi hoặc `make aggregator` đang chạy, không có thì test biểu đồ tự bỏ qua.
Test đợt nuôi (`tests/ui/test_web_cycles.py`) tự tạo khách thuê khay rồi thao tác như Operator.
Test thiết bị (`tests/ui/test_web_devices.py`) kiểm khóa API hiện ra dùng được thật, bị từ chối khi tắt thiết bị và khi đã đổi khóa.
Test danh mục (`tests/ui/test_web_catalog.py`) kiểm cả phía khách: khay mới làm tăng số khay trống, gói bị tắt biến mất khỏi danh sách của khách, phòng/khay đã thuê không ngừng/xóa được.
Đặt `UI_SHOTS=thư-mục` để lưu ảnh chụp màn hình, `E2E_HEADED=1` để xem trình duyệt chạy.

## Cấu trúc

```
src/api/        http.ts (gọi API, lỗi thống nhất {error:{code,message}}), auth.ts, core.ts (và các nhóm API ở bước sau)
src/auth/       session.ts (lưu phiên, hạn token), AuthContext.tsx (đăng nhập, đăng xuất, tự thoát khi hết hạn hoặc bị 401)
src/components/ Layout (thanh bên theo vai trò), RequireRole (chặn theo quyền), TrayStrip, Notice, SporePrint
src/pages/      Login, Home (Tổng quan), Monitoring (danh sách phòng), RoomDetail (số đo, biểu đồ 5 phút, camera, ngưỡng), Notifications, Cycles + CycleDetail (đợt nuôi: chuyển giai đoạn, thu hoạch, loại bỏ), Devices (tạo thiết bị, khóa API hiện một lần, đổi khóa, bật/tắt), Catalog (Admin: phòng, khay thêm hàng loạt, gói thuê; mã nguồn từng tab ở pages/catalog/), NotFound
src/lib/        format.ts (hàm thuần: mức so với ngưỡng, đứt đường khi mất dữ liệu, trục Y, thời gian)
```

Thêm một trang: tạo trong `src/pages/`, thêm `<Route>` trong `src/App.tsx` (bọc `<RequireRole roles={['ADMIN']}>` nếu chỉ Admin được vào),
rồi chuyển `ready: true` cho mục tương ứng trong `NAV` ở `src/components/Layout.tsx`.

## Ghi chú

- Phiên đăng nhập lưu ở `localStorage` (khóa `mushroom.session`), tự xóa khi token hết hạn; đăng xuất ở một tab thì các tab khác cũng thoát.
- JWT không có refresh token (SRS), hết hạn thì đăng nhập lại.
- API khay hiện trả `snake_case`, phòng trả `camelCase`; `src/api/core.ts` chuẩn hóa để phần còn lại của giao diện dùng một kiểu.
