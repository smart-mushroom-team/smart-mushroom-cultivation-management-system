# Quy ước phát triển

## 1. Phân tầng trong mỗi service

> **Module mẫu: Identity.** Mở `services/identity/` và đọc `services/identity/README.md` trước khi viết module mới:
> mọi quy ước dưới đây đều có ví dụ chạy thật và có test ở đó.

```
routes  →  controllers  →  services  →  repositories  →  db  →  PostgreSQL
 (ai được gọi)  (HTTP in/out)  (nghiệp vụ)    (SQL)
```

| Tầng           | Được làm                                                      | KHÔNG được làm                      |
| -------------- | ------------------------------------------------------------- | ----------------------------------- |
| `routes`       | Gắn URL, `validate(...)`, `requireRole(...)`                  | Chứa logic                          |
| `validators`   | Schema zod cho body/query/params                              | Truy cập DB                         |
| `controllers`  | Đọc `req.validated`, gọi service, trả `res.status().json()`   | Truy cập DB, chứa quy tắc nghiệp vụ |
| `services`     | Quy tắc BR-xx, mở giao dịch, ném `AppError`, gọi service khác | Biết về `req`/`res` của Express     |
| `repositories` | SQL tham số hóa; nhận `db` (hoặc `tx`) làm tham số đầu tiên   | Quyết định nghiệp vụ                |

**Tiêm phụ thuộc (DI):** controller, service được tạo bằng hàm factory nhận phụ thuộc qua tham số, và chỉ được lắp ráp
ở MỘT nơi (`src/container.js`). Nhờ vậy test thay được DB (PGlite) và đồng hồ (giờ giả) mà không cần mock.

```js
// controllers/room.controller.js — controller chỉ làm việc với HTTP
function createRoomController({ roomService }) {
  return {
    create: async (req, res) => {
      res.status(201).json(await roomService.create(req.validated.body)); // Express 5 tự bắt lỗi hàm async
    },
  };
}

// routes/room.routes.js — phân quyền + validate ở route
function createRoomRoutes(controller) {
  const router = Router();
  router.post('/', staff, validate({ body: createRoomBody }), controller.create);
  return router;
}
```

## 2. Định dạng response

- Thành công: trả đúng schema trong `docs/openapi/*.yaml`. Danh sách phân trang: `{ items, page, limit, total }`.
- Lỗi: luôn qua `AppError` (`conflict()`, `notFound()`, `forbidden()`, ...) để ra
  `{ "error": { "code", "message", "details?", "requestId" } }`. Không tự `res.status(4xx).json(...)`.
- Mã lỗi nằm trong `ERROR_CODES` (`libs/shared/src/constants.js`); thêm mã mới thì cập nhật cả OpenAPI.
- Customer truy cập tài nguyên của người khác: trả **404** (không lộ sự tồn tại), không phải 403 (BR-02).

## 3. Truy cập dữ liệu: Prisma + SQL qua `db`

- **Prisma** lo schema, migration, kết nối và giao dịch. **SQL tham số hóa** nằm trong `repositories/` và chạy qua
  giao diện `db` (`db.query(sql, params)`, `db.transaction(fn)`); xem `libs/shared/src/db.js`.
- Vì sao không gọi Prisma Client trong repository: repository chỉ phụ thuộc `db` nên **toàn bộ SQL được test trên
  PostgreSQL thật** (PGlite chạy đúng file migration, không cần Docker). Code gọi Prisma Client thì không test được
  theo cách này. `prisma/seed.js` vẫn dùng Prisma Client vì chạy một lần và không chứa nghiệp vụ.
- **Luôn tham số hóa** (`$1`, `$2`...), **không bao giờ nối chuỗi** dữ liệu người dùng vào SQL. Tên cột trong UPDATE
  động chỉ lấy từ danh sách trắng cố định (xem `user.repository.js`).

Quy ước kiểu tham số để SQL chạy giống nhau trên Prisma và PGlite:

| Kiểu          | Viết                                                  | Ghi chú                                      |
| ------------- | ----------------------------------------------------- | -------------------------------------------- |
| uuid          | `$1::text::uuid`                                      | tham số luôn là chuỗi, ép kiểu ở phía SQL    |
| enum          | `$1::text::"Role"`; SELECT dùng `role::text AS role`  | tên enum đúng như trong `schema.prisma`      |
| thời gian     | truyền `date.toISOString()` + `$1::text::timestamptz` |                                              |
| số nguyên     | `$1::bigint`; đếm dùng `count(*)::int`                | `count(*)` trần trả BigInt, dễ gây lỗi       |
| tìm kiếm LIKE | `escapeLike(q)` (có sẵn ở `@mushroom/shared`)         | để `%` `_` do người dùng nhập khớp nghĩa đen |

Ví dụ BR-01 (giữ khay chống bán lố):

```js
// repositories/tray.repository.js
const lockAvailable = (tx, count) =>
  tx.query(
    `SELECT t.id FROM trays t JOIN rooms r ON r.id = t.room_id
     WHERE t.occupancy_status = 'AVAILABLE' AND r.status = 'ACTIVE'
     ORDER BY t.tray_code
     LIMIT $1::bigint
     FOR UPDATE OF t SKIP LOCKED`,
    [count],
  );

// services/rental.service.js
return db.transaction(async (tx) => {
  const trays = await trayRepo.lockAvailable(tx, trayCount);
  if (trays.length < trayCount) {
    throw conflict('Không đủ khay trống', ERROR_CODES.INSUFFICIENT_TRAYS, {
      available: trays.length,
    });
  }
  // cập nhật khay -> RESERVED, tạo Rental(PAID) + Transaction trong CÙNG giao dịch
});
```

**Quy tắc giao dịch**

- Mọi thay đổi trạng thái có nhiều bước (đặt thuê, xác nhận, từ chối, hết hạn) phải nằm trong **một** `db.transaction`.
- **Ném lỗi trong giao dịch là ROLLBACK.** Nếu cần giữ lại một thay đổi rồi mới báo lỗi (ví dụ thu hồi token khi
  phát hiện dùng lại), hãy **trả về kết quả** từ giao dịch rồi ném lỗi **sau khi đã commit** (xem `auth.service.js`, hàm `refresh`).
- Việc tốn CPU (bcrypt...) làm **trước** khi mở giao dịch, đừng giữ khóa dòng trong lúc tính toán.
- Cập nhật cạnh tranh phải nguyên tử trong một câu SQL (ví dụ đếm đăng nhập sai) hoặc dùng `FOR UPDATE`.
- Mọi quy tắc "chỉ một" (BR-01, BR-06, BR-09) phải có **partial unique index** ở DB, không chỉ kiểm tra bằng code.

## 4. Giao tiếp giữa service

- Chỉ gọi nhau qua HTTP tới `/internal/**` kèm `X-Service-Key`, không đi qua Gateway, không truy vấn chéo DB.
- Mọi lời gọi liên service phải có **timeout** và **xử lý lỗi rõ ràng**. Với kiểm tra quyền (BR-08): lỗi ⇒ từ chối.
- Cảnh báo/thông báo phải **idempotent** bằng `dedupeKey` (BR-14); job chạy lại không tạo trùng.
- Gửi FCM: dùng `push.service.sendToTokens` (không ném lỗi). Luôn lưu `Notification` vào DB **trước**.

## 5. Bảo mật

- Không commit `.env`, `secrets/*`, service account Firebase. CI/`.gitignore` đã chặn các mẫu phổ biến, nhưng vẫn phải tự kiểm tra `git status`.
- Không log mật khẩu, token, `X-Device-Key`, `X-Service-Key` (logger đã redact header).
- Mật khẩu băm bằng bcrypt; API key thiết bị và refresh token băm SHA-256, chỉ trả plaintext một lần.
- Không lộ thông tin tài khoản: sai email và sai mật khẩu phải cho **cùng một** phản hồi (cả nội dung lẫn thời gian).
- Mọi response người dùng đi qua hàm DTO (`utils/dto.js`), không bao giờ trả `passwordHash` hay các trường nội bộ.
- Validate mọi input bằng zod ở route.

## 6. Git

- Nhánh: `main` (ổn định, được bảo vệ), `develop` (tích hợp), nhánh làm việc `feature/<module>-<mô-tả>`,
  `fix/<mô-tả>`, `docs/<mô-tả>`. Ví dụ `feature/core-rental-create`.
- **Không push thẳng** `main`/`develop`. Mở Pull Request, tối thiểu 1 người review, CI xanh mới merge.
- Commit theo [Conventional Commits](https://www.conventionalcommits.org/): `feat(core): đặt thuê khay chống trùng`,
  `fix(monitoring): ...`, `docs(openapi): ...`, `chore: ...`, `test: ...`.
- PR nhỏ, một chức năng, kèm test. Đổi API thì sửa `docs/openapi/*.yaml` **trong cùng PR**.
- Mỗi thành viên commit đều đặn dưới tên mình (lịch sử Git thể hiện đóng góp).

### Bật bảo vệ nhánh (làm một lần trên GitHub)

Settings → Branches → Add rule cho `main` (và `develop`): _Require a pull request before merging_,
_Require approvals (1)_, _Require status checks to pass_ (chọn job `lint-test`).

## 7. Test

- `npm test` dùng test runner có sẵn của Node (`node --test`), không cần cài thêm.
- **Test cả ngăn xếp trên PostgreSQL thật.** Mẫu: `services/identity/test/helpers.js` (`setupApp`) dựng toàn bộ ứng dụng
  (routes → controllers → services → repositories → SQL) trên PGlite đã chạy migration thật, kèm đồng hồ giả để "tua"
  thời gian (hết hạn token, hết thời gian khóa). Không mock repository.
- Mỗi endpoint cần test: thành công, **phân quyền** (401/403 theo từng vai trò), dữ liệu sai (422), không tồn tại (404),
  và mọi nhánh lỗi nghiệp vụ (409...).
- Quy tắc nghiệp vụ quan trọng phải có test: BR-01 (đặt đồng thời), BR-04 (vòng đời đơn thuê),
  BR-06 (chỉ thu hoạch khi FRUITING/READY, giai đoạn chỉ tiến), BR-05 (ngày hết hạn), BR-07 (hết hạn và hoàn tất),
  BR-08 (quyền xem phòng), BR-12 (N lần liên tiếp), BR-14 (job idempotent).
- **Tự kiểm tra test của mình bằng cách phá code có chủ đích** (đổi một điều kiện, bỏ một dòng kiểm tra) rồi xem test có
  đỏ không. Test không bao giờ đỏ là test vô dụng.
- Sau khi cài đặt xong một module, chạy thử trên hệ thống thật qua Gateway (xem `scripts/smoke-identity.js` làm mẫu).
  Test PGlite không kiểm chứng được lớp Prisma và Docker.
