'use strict';

const { escapeLike } = require('@mushroom/shared');

/**
 * Repository = nơi DUY NHẤT chứa SQL của bảng users. Mọi hàm nhận `db` làm tham số đầu tiên:
 * truyền `db` gốc để chạy đơn lẻ, hoặc `tx` (từ db.transaction) để chạy trong giao dịch.
 *
 * Quy ước kiểu tham số (chạy giống nhau trên Prisma và PGlite, xem libs/shared/src/db.js):
 *   uuid -> $n::text::uuid | enum -> $n::text::"Role" | thời gian -> ISO string + $n::text::timestamptz
 *   số nguyên -> $n::bigint | SELECT enum -> col::text
 * Tên cột trong câu UPDATE động chỉ lấy từ danh sách trắng bên dưới, KHÔNG bao giờ từ dữ liệu người dùng.
 */

const COLUMNS = `id, name, email, password_hash, role::text AS role, status::text AS status,
  phone, address, failed_login_count, locked_until, last_login_at, created_at`;

const map = (r) =>
  r && {
    id: r.id,
    name: r.name,
    email: r.email,
    passwordHash: r.password_hash,
    role: r.role,
    status: r.status,
    phone: r.phone,
    address: r.address,
    failedLoginCount: r.failed_login_count,
    lockedUntil: r.locked_until,
    lastLoginAt: r.last_login_at,
    createdAt: r.created_at,
  };

const iso = (d) => d.toISOString();

async function findByEmail(db, email) {
  const rows = await db.query(`SELECT ${COLUMNS} FROM users WHERE email = $1`, [email]);
  return map(rows[0]) || null;
}

async function findById(db, id) {
  const rows = await db.query(`SELECT ${COLUMNS} FROM users WHERE id = $1::text::uuid`, [id]);
  return map(rows[0]) || null;
}

async function insert(db, { name, email, passwordHash, role, phone = null, address = null }) {
  const rows = await db.query(
    `INSERT INTO users (name, email, password_hash, role, phone, address)
     VALUES ($1, $2, $3, $4::text::"Role", $5, $6)
     RETURNING ${COLUMNS}`,
    [name, email, passwordHash, role, phone, address],
  );
  return map(rows[0]);
}

// Danh sách trắng cột được phép cập nhật: khóa của patch => [tên cột, phần ép kiểu]
const UPDATABLE = {
  name: ['name', ''],
  phone: ['phone', ''],
  address: ['address', ''],
  passwordHash: ['password_hash', ''],
  role: ['role', '::text::"Role"'],
  status: ['status', '::text::"UserStatus"'],
};

/** Cập nhật các trường có trong patch (undefined = bỏ qua, null = đặt NULL). Trả null nếu không có người dùng. */
async function update(db, id, patch) {
  const params = [id];
  const sets = [];
  for (const [key, [column, cast]] of Object.entries(UPDATABLE)) {
    if (patch[key] === undefined) continue;
    params.push(patch[key]);
    sets.push(`${column} = $${params.length}${cast}`);
  }
  if (sets.length === 0) return findById(db, id);
  const rows = await db.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $1::text::uuid RETURNING ${COLUMNS}`,
    params,
  );
  return map(rows[0]) || null;
}

async function list(db, { role, status, q, limit, offset }) {
  const where = [];
  const params = [];
  if (role) where.push(`role = $${params.push(role)}::text::"Role"`);
  if (status) where.push(`status = $${params.push(status)}::text::"UserStatus"`);
  if (q) {
    const i = params.push(`%${escapeLike(q)}%`); // % và _ do người dùng nhập được hiểu theo nghĩa đen
    where.push(`(name ILIKE $${i} OR email ILIKE $${i})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = await db.query(`SELECT count(*)::int AS total FROM users ${whereSql}`, params);
  const rows = await db.query(
    `SELECT ${COLUMNS} FROM users ${whereSql}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length + 1}::bigint OFFSET $${params.length + 2}::bigint`,
    [...params, limit, offset],
  );
  return { rows: rows.map(map), total: total[0].total };
}

/**
 * Ghi nhận một lần đăng nhập sai, NGUYÊN TỬ trong một câu UPDATE (an toàn khi nhiều request đồng thời):
 * tăng bộ đếm; nếu chạm ngưỡng thì khóa đến `lockedUntil` và đặt lại bộ đếm về 0.
 * (Trong UPDATE, mọi biểu thức ở vế phải đều thấy giá trị CŨ của dòng.)
 */
async function recordFailedLogin(db, id, { maxFailures, lockedUntil }) {
  const rows = await db.query(
    `UPDATE users SET
       failed_login_count = CASE WHEN failed_login_count + 1 >= $2::bigint THEN 0 ELSE failed_login_count + 1 END,
       locked_until = CASE WHEN failed_login_count + 1 >= $2::bigint THEN $3::text::timestamptz ELSE locked_until END
     WHERE id = $1::text::uuid
     RETURNING failed_login_count, locked_until`,
    [id, maxFailures, iso(lockedUntil)],
  );
  return { failedLoginCount: rows[0].failed_login_count, lockedUntil: rows[0].locked_until };
}

async function recordSuccessfulLogin(db, id, now) {
  await db.query(
    `UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = $2::text::timestamptz
     WHERE id = $1::text::uuid RETURNING id`,
    [id, iso(now)],
  );
}

/** Mở khóa đăng nhập (Admin kích hoạt lại hoặc đặt lại mật khẩu). */
async function clearLoginLock(db, id) {
  await db.query(
    `UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = $1::text::uuid RETURNING id`,
    [id],
  );
}

/**
 * Khóa (FOR UPDATE) mọi Admin đang hoạt động và trả về id. Dùng trước khi vô hiệu hóa/hạ quyền Admin
 * để hai thao tác đồng thời không thể cùng xóa Admin cuối cùng. Sắp xếp theo id để tránh deadlock.
 */
async function lockActiveAdmins(db) {
  const rows = await db.query(
    `SELECT id FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' ORDER BY id FOR UPDATE`,
  );
  return rows.map((r) => r.id);
}

module.exports = {
  findByEmail,
  findById,
  insert,
  update,
  list,
  recordFailedLogin,
  recordSuccessfulLogin,
  clearLoginLock,
  lockActiveAdmins,
};
