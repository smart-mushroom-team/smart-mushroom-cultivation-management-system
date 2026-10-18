# Identity Service

Xác thực và quản lý người dùng: đăng ký, đăng nhập, JWT, refresh token, hồ sơ, quản trị người dùng.
Đây là **module mẫu** của cả nhóm: Core và Monitoring nên viết theo đúng cách tổ chức, kiểm tra đầu vào, xử lý lỗi và
kiểm thử ở đây. Hợp đồng API: [`docs/openapi/identity.yaml`](../../docs/openapi/identity.yaml). Dữ liệu: bảng
`users`, `refresh_tokens` trong `identity_db` (xem [`docs/DATABASE.md`](../../docs/DATABASE.md)).

## Cấu trúc

```
src/
├── index.js                 khởi động: đọc cấu hình, tạo db (Prisma), listen, tắt êm
├── app.js                   createApp({ config, logger, db, clock }): lắp middleware + routes + xử lý lỗi
├── container.js             NƠI DUY NHẤT lắp ráp repositories -> services -> controllers (DI)
├── config/index.js          đọc biến môi trường (fail fast khi thiếu)
├── config/prisma.js         PrismaClient tạo lười
├── errors.js                lỗi nghiệp vụ riêng (sai thông tin đăng nhập, khóa tạm, vô hiệu hóa)
├── routes/                  URL + phân quyền theo vai trò + validate
├── validators/              schema zod (body / query / params)
├── controllers/             chỉ làm việc với HTTP: req.validated -> service -> res
├── services/                NGHIỆP VỤ: auth.service, user.service (+ password.service, token.service)
├── repositories/            SQL của users và refresh_tokens (nhận db/tx làm tham số đầu)
└── utils/dto.js             toUserDto: lối ra DUY NHẤT của dữ liệu người dùng
prisma/schema.prisma, migrations/, seed.js
test/                        helpers.js (setupApp) + auth / me / users / db tests
```

## Endpoint

Qua Gateway: `http://localhost:8080/api/identity/...`

| Method & đường dẫn               | Quyền        | Yêu cầu      | Ghi chú                                                 |
| -------------------------------- | ------------ | ------------ | ------------------------------------------------------- |
| `POST /auth/register`            | công khai    | FR-03        | luôn tạo `CUSTOMER`; gửi `role` => 422                  |
| `POST /auth/login`               | công khai    | FR-02, UC-01 | khóa 5 phút sau 5 lần sai; trả JWT + refresh token      |
| `POST /auth/refresh`             | công khai    | BR-16        | xoay vòng: mỗi refresh token dùng **một lần**           |
| `POST /auth/logout`              | công khai    | BR-16        | thu hồi refresh token, luôn 204                         |
| `GET /me`, `PATCH /me`           | đã đăng nhập | FR-05        | sửa tên, điện thoại, địa chỉ; không sửa email/vai trò   |
| `GET /users`                     | ADMIN        | FR-04        | phân trang, lọc `role`/`status`, tìm `q` theo tên/email |
| `POST /users`                    | ADMIN        | FR-04        | tạo tài khoản với vai trò bất kỳ                        |
| `GET/PATCH /users/:id`           | ADMIN        | FR-04        | sửa tên, vai trò, điện thoại, địa chỉ                   |
| `POST /users/:id/deactivate`     | ADMIN        | FR-04, BR-15 | không xóa; thu hồi mọi phiên; idempotent                |
| `POST /users/:id/activate`       | ADMIN        | FR-04        | kích hoạt lại và gỡ khóa đăng nhập                      |
| `POST /users/:id/reset-password` | ADMIN        | FR-04        | đổi mật khẩu, gỡ khóa, thu hồi mọi phiên                |

Tài khoản Admin đầu tiên (FR-01): `npm run db:seed -w services/identity` (đọc `SEED_ADMIN_*`).

## Các luồng quan trọng

**Đăng nhập** (`auth.service.js › login`)

```
tìm user theo email ── không có ──▶ băm giả (chống dò thời gian) ──▶ 401 (cùng thông báo với sai mật khẩu)
   │ có
   ├─ đang khóa (locked_until > now) ──▶ 423 ACCOUNT_LOCKED   (không kiểm mật khẩu)
   ├─ sai mật khẩu ──▶ UPDATE nguyên tử đếm sai; chạm ngưỡng => khóa, đếm về 0 ──▶ 423 hoặc 401
   ├─ mật khẩu đúng nhưng INACTIVE ──▶ 403 ACCOUNT_DISABLED   (chỉ báo SAU KHI mật khẩu đúng)
   └─ OK ──▶ đặt lại bộ đếm, ghi last_login_at, cấp access JWT + refresh token
```

**Làm mới token** (`auth.service.js › refresh`): trong một giao dịch, tìm băm token; đã thu hồi => **thu hồi toàn bộ
phiên** của người đó (nghi bị đánh cắp) và trả 401; hết hạn / không có => 401; tài khoản INACTIVE => thu hồi hết và 403;
ngược lại "giành quyền" dùng token bằng `UPDATE ... WHERE revoked_at IS NULL` (chỉ MỘT request thắng khi chạy đồng thời),
cấp cặp token mới với vai trò/họ tên mới nhất.

> Giao dịch **trả kết quả** chứ không ném lỗi, vì ném lỗi là ROLLBACK và việc thu hồi token sẽ bị hủy. Test
> `dùng lại token ĐÃ XOAY ...` bảo vệ điều này.

**Luôn còn Admin** (`user.service.js › assertAnotherActiveAdmin`): trước khi vô hiệu hóa hoặc hạ quyền một Admin, khóa
(`FOR UPDATE`) mọi Admin đang hoạt động và yêu cầu còn ít nhất một Admin khác; Admin cũng không tự vô hiệu hóa mình.

## Quyết định bảo mật

| Vấn đề                     | Cách xử lý                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Lưu mật khẩu               | bcrypt (`BCRYPT_ROUNDS`, mặc định 10); giới hạn 72 **byte** vì bcrypt cắt cụt                                         |
| Dò email                   | sai email và sai mật khẩu: cùng mã, cùng thông báo, cùng thời gian (băm giả)                                          |
| Dò mật khẩu                | khóa tạm theo tài khoản (`MAX_FAILED_LOGINS`, `LOCK_MINUTES`), đếm nguyên tử bằng một câu SQL                         |
| Đánh cắp refresh token     | chỉ lưu SHA-256; xoay vòng; dùng lại token cũ => thu hồi toàn bộ phiên                                                |
| Tự cấp quyền               | `z.strictObject`: trường lạ (`role`, `status`...) bị 422 ở đăng ký và `/me`                                           |
| SQL injection / ký tự LIKE | tham số hóa; `%` `_` của người dùng được escape                                                                       |
| Lộ dữ liệu                 | mọi response qua `toUserDto`; test khẳng định không có `passwordHash`                                                 |
| Email khác hoa/thường      | chuẩn hóa chữ thường ở validator, DB có CHECK `email = lower(email)`                                                  |
| Access token đã cấp        | **không thu hồi tức thì**, sống tối đa `JWT_EXPIRES_IN` (mặc định 1h, BR-16); vai trò mới có hiệu lực sau lần refresh |

## Cấu hình

| Biến                     | Mặc định   | Ý nghĩa                                            |
| ------------------------ | ---------- | -------------------------------------------------- |
| `PORT`                   | 3001       | cổng                                               |
| `JWT_SECRET`             | (bắt buộc) | khóa HS256, dùng chung với Gateway/Core/Monitoring |
| `JWT_EXPIRES_IN`         | 1h         | hạn access token                                   |
| `REFRESH_TOKEN_TTL_DAYS` | 7          | hạn refresh token                                  |
| `MAX_FAILED_LOGINS`      | 5          | số lần sai liên tiếp dẫn đến khóa                  |
| `LOCK_MINUTES`           | 5          | thời gian khóa                                     |
| `BCRYPT_ROUNDS`          | 10         | chi phí băm (test dùng 4)                          |
| `DATABASE_URL`           | (bắt buộc) | kết nối `identity_db`                              |

## Kiểm thử

```bash
npm test -w services/identity            # ~56 test, chạy trên PostgreSQL thật (PGlite), không cần Docker
node scripts/smoke-identity.js           # đầu-cuối trên hệ thống thật qua Gateway (cần docker compose up + db:seed)
```

- `test/helpers.js › setupApp(t)` dựng toàn bộ ứng dụng trên DB đã chạy migration, kèm **đồng hồ giả**
  (`clock.advance(8 * DAY)` để làm hết hạn refresh token mà không phải chờ).
- Test dựng dữ liệu bằng SQL trực tiếp (`makeUser`) rồi gọi API thật; không mock repository.
- Đã kiểm tra bộ test bằng cách phá code có chủ đích (bỏ kiểm tra khóa, bỏ escape LIKE, bỏ bảo vệ Admin cuối, lộ
  `passwordHash`, ném lỗi trong giao dịch...): mọi lần phá đều làm test đỏ.

## Thêm một endpoint mới theo mẫu này

1. **OpenAPI trước**: sửa `docs/openapi/<service>.yaml` (đường dẫn, quyền, schema, các mã lỗi).
2. **Validator**: thêm schema zod vào `validators/` (dùng `z.strictObject` cho body; `z.coerce` cho query).
3. **Repository**: thêm hàm SQL (tham số hóa, ép kiểu theo `docs/CONVENTIONS.md` mục 3). Hàm nhận `db` đầu tiên.
4. **Service**: viết nghiệp vụ, ném `AppError` (`conflict()`, `notFound()`...), dùng `db.transaction` khi nhiều bước.
5. **Controller**: lấy `req.validated`, gọi service, trả response (qua DTO).
6. **Route**: gắn URL + `validate(...)` + phân quyền (`requireRole`) trong `routes/`.
7. **Test**: thành công, 401/403 theo từng vai trò, 422, 404, mọi nhánh lỗi nghiệp vụ.
8. **Phá thử**: đổi một điều kiện quan trọng và xác nhận test đỏ; chạy lại `lint`, `format:check`, `test`.

## Chưa làm / giới hạn đã biết

- Quên mật khẩu qua email, xác thực email (mức C): chưa có.
- Refresh token hết hạn hoặc đã thu hồi chưa được dọn khỏi bảng (cần một job xóa định kỳ nếu bảng lớn).
- Client **phải gửi yêu cầu refresh tuần tự**: hai yêu cầu song song với cùng một token sẽ bị coi là dùng lại và làm
  mất phiên. (Mobile/web nên dùng một "single-flight" cho việc làm mới token.)
- Giới hạn tốc độ theo IP chỉ có ở Gateway (toàn cục); chống dò mật khẩu theo tài khoản do khóa tạm đảm nhiệm.
