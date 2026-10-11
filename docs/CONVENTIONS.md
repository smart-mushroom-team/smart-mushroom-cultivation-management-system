# Quy ước phát triển

## 1. Phân tầng trong mỗi service

```
routes  →  controllers  →  services  →  repositories  →  DB
 (ai được gọi)  (HTTP in/out)  (nghiệp vụ)    (truy vấn)
```

| Tầng           | Được làm                                                      | KHÔNG được làm                      |
| -------------- | ------------------------------------------------------------- | ----------------------------------- |
| `routes`       | Gắn URL, `validate(...)`, `requireRole(...)`                  | Chứa logic                          |
| `controllers`  | Đọc `req`, gọi service, trả `res.status().json()`             | Truy cập DB, chứa quy tắc nghiệp vụ |
| `services`     | Quy tắc BR-xx, mở giao dịch, ném `AppError`, gọi service khác | Biết về `req`/`res` của Express     |
| `repositories` | Prisma / raw SQL, nhận `tx` để dùng trong giao dịch           | Quyết định nghiệp vụ                |

Controller ví dụ (Express 5 tự bắt lỗi của hàm `async`, không cần `try/catch`):

```js
// controllers/room.controller.js
const roomService = require('../services/room.service');

async function create(req, res) {
  const room = await roomService.create(req.validated.body);
  res.status(201).json(room);
}
module.exports = { create /* ... */ };
```

Route tương ứng (phân quyền + validate ở route):

```js
// routes/room.routes.js
const { z } = require('zod');
const { validate, requireRole, ROLES } = require('@mushroom/shared');
const createSchema = z.object({ name: z.string().min(1).max(100) });
router.post('/', staff, validate({ body: createSchema }), controller.create);
```

## 2. Định dạng response

- Thành công: trả đúng schema trong `docs/openapi/*.yaml`. Danh sách phân trang: `{ items, page, limit, total }`.
- Lỗi: luôn qua `AppError` (`conflict()`, `notFound()`, `forbidden()`, ...) để ra
  `{ "error": { "code", "message", "details?", "requestId" } }`. Không tự `res.status(4xx).json(...)`.
- Mã lỗi nằm trong `ERROR_CODES` (`libs/shared/src/constants.js`); thêm mã mới thì cập nhật cả OpenAPI.
- Customer truy cập tài nguyên của người khác: trả **404** (không lộ sự tồn tại), không phải 403 (BR-02).

## 3. Prisma + raw SQL

Dùng Prisma Client cho CRUD thông thường. Dùng raw SQL khi cần khóa dòng, cập nhật có điều kiện hoặc truy vấn
tổng hợp. **Luôn dùng tagged template** (`$queryRaw\`...\``) để tham số hóa, **không** nối chuỗi.

Ví dụ BR-01 (giữ khay chống bán lố):

```js
// repositories/tray.repository.js
function lockAvailable(tx, count) {
  return tx.$queryRaw`
    SELECT t.id
    FROM trays t JOIN rooms r ON r.id = t.room_id
    WHERE t.occupancy_status = 'AVAILABLE' AND r.status = 'ACTIVE'
    ORDER BY t.tray_code
    LIMIT ${count}
    FOR UPDATE OF t SKIP LOCKED`;
}

// services/rental.service.js
return prisma.$transaction(async (tx) => {
  const trays = await trayRepository.lockAvailable(tx, trayCount);
  if (trays.length < trayCount) {
    throw conflict('Không đủ khay trống', ERROR_CODES.INSUFFICIENT_TRAYS, {
      available: trays.length,
    });
  }
  // cập nhật khay -> RESERVED, tạo Rental(PAID) + Transaction trong CÙNG giao dịch
});
```

Mọi thay đổi trạng thái có nhiều bước (đặt thuê, xác nhận, từ chối, hết hạn) phải nằm trong **một** `$transaction`.
Mọi quy tắc "chỉ một" (BR-01, BR-06, BR-09) phải có **partial unique index** ở DB (xem đầu `schema.prisma`),
không chỉ kiểm tra bằng code.

## 4. Giao tiếp giữa service

- Chỉ gọi nhau qua HTTP tới `/internal/**` kèm `X-Service-Key`, không đi qua Gateway, không truy vấn chéo DB.
- Mọi lời gọi liên service phải có **timeout** và **xử lý lỗi rõ ràng**. Với kiểm tra quyền (BR-08): lỗi ⇒ từ chối.
- Cảnh báo/thông báo phải **idempotent** bằng `dedupeKey` (BR-14); job chạy lại không tạo trùng.
- Gửi FCM: dùng `push.service.sendToTokens` (không ném lỗi). Luôn lưu `Notification` vào DB **trước**.

## 5. Bảo mật

- Không commit `.env`, `secrets/*`, service account Firebase. CI/`.gitignore` đã chặn các mẫu phổ biến, nhưng vẫn phải tự kiểm tra `git status`.
- Không log mật khẩu, token, `X-Device-Key`, `X-Service-Key` (logger đã redact header).
- Mật khẩu băm bằng bcrypt; API key thiết bị băm SHA-256, chỉ trả plaintext một lần.
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
- Quy tắc nghiệp vụ quan trọng phải có test: BR-01 (đặt đồng thời), BR-04 (vòng đời đơn thuê), BR-06 (chỉ thu hoạch khi FRUITING/READY, giai đoạn chỉ tiến),
  BR-05 (ngày hết hạn), BR-07 (hết hạn và hoàn tất), BR-08 (quyền xem phòng), BR-12 (N lần liên tiếp),
  BR-14 (job idempotent).
- Test API mẫu nằm ở `services/*/test/routes.test.js` (bảng phân quyền); thêm test cho từng endpoint khi cài đặt.
