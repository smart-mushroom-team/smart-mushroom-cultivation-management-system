'use strict';

/**
 * Lớp truy cập DB mỏng, dùng chung cho mọi service.
 *
 * Giao diện `db` (cả bản Prisma lẫn bản test PGlite đều giống nhau):
 *   db.query(sql, params?)   -> Promise<Array<row>>      (SQL tham số hóa $1, $2, ...)
 *   db.transaction(fn)       -> Promise<kết quả của fn>  (fn nhận một `tx` có cùng giao diện;
 *                                                         fn ném lỗi => ROLLBACK)
 *
 * Vì sao có lớp này: repository chỉ phụ thuộc vào `db`, nên TOÀN BỘ SQL của một service được kiểm thử
 * trên PostgreSQL thật (PGlite, chạy đúng file migration) mà không cần Docker, trong khi production
 * dùng Prisma làm bộ kết nối và quản lý giao dịch. Xem services/identity/README.md.
 */

/** Bọc một Prisma client (hoặc client giao dịch `tx`) thành giao diện `db`. */
function wrapPrisma(client, { inTransaction, prisma }) {
  const db = {
    query: (sql, params = []) => client.$queryRawUnsafe(sql, ...params),
    transaction: inTransaction
      ? (fn) => fn(db) // đã ở trong giao dịch: dùng chung giao dịch hiện tại
      : (fn) => prisma.$transaction((tx) => fn(wrapPrisma(tx, { inTransaction: true, prisma }))),
  };
  return db;
}

/**
 * Adapter cho PrismaClient. Dùng $queryRawUnsafe với tham số vị trí ($1, $2...): "Unsafe" chỉ cảnh báo
 * việc NỐI CHUỖI vào SQL; tham số vẫn được gửi tách biệt nên an toàn trước SQL injection.
 *
 * Quy ước viết SQL để chạy giống nhau trên Prisma và PGlite:
 *  - uuid:      `$1::text::uuid`        (tham số luôn là chuỗi, ép kiểu ở phía SQL)
 *  - enum:      `$1::text::"Role"`      và khi SELECT dùng `role::text AS role`
 *  - thời gian: truyền `date.toISOString()` và dùng `$1::text::timestamptz`
 *  - số nguyên: `$1::bigint` (Prisma gửi số nguyên JS dạng int8); COUNT dùng `count(*)::int`
 */
function createPrismaDb(prisma) {
  return wrapPrisma(prisma, { inTransaction: false, prisma });
}

/**
 * Lấy SQLSTATE từ lỗi DB, bất kể nguồn: Prisma raw (P2010, meta.code) hoặc driver trực tiếp (err.code).
 * Ví dụ: '23505' trùng khóa duy nhất, '23503' khóa ngoại, '23514' CHECK/trigger, '23001' RESTRICT.
 */
function sqlState(err) {
  if (!err) return undefined;
  if (err.code === 'P2010' && err.meta && err.meta.code) return String(err.meta.code);
  if (
    typeof err.code === 'string' &&
    /^[0-9A-Z]{5}$/.test(err.code) &&
    !/^P\d{4}$/.test(err.code)
  ) {
    return err.code;
  }
  return undefined;
}

const isUniqueViolation = (err) => sqlState(err) === '23505' || (err && err.code === 'P2002');

/** Escape ký tự đặc biệt của LIKE/ILIKE (%, _, \) để tìm kiếm theo đúng nghĩa đen. */
function escapeLike(text) {
  return String(text).replace(/[\\%_]/g, (c) => `\\${c}`);
}

module.exports = { createPrismaDb, sqlState, isUniqueViolation, escapeLike };
