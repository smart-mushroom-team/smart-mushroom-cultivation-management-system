'use strict';

/**
 * Helper test cơ sở dữ liệu: chạy migration THẬT của một service trên PostgreSQL chạy trong WASM
 * (PGlite), không cần Docker. Dùng để kiểm chứng các ràng buộc nghiệp vụ ở tầng DB (BR-01, BR-04, ...).
 *
 *   const { migratedDb, expectDbError } = require('@mushroom/shared/testing/pglite');
 *   const db = await migratedDb('core');
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const SERVICES_DIR = path.join(__dirname, '..', '..', '..', 'services');

/** Tạo DB mới và áp dụng tuần tự mọi migration trong services/<service>/prisma/migrations. */
async function migratedDb(service) {
  const { PGlite } = require('@electric-sql/pglite');
  const db = new PGlite();
  const dir = path.join(SERVICES_DIR, service, 'prisma', 'migrations');
  const folders = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const folder of folders) {
    await db.exec(fs.readFileSync(path.join(dir, folder, 'migration.sql'), 'utf8'));
  }
  return db;
}

/**
 * Bọc một PGlite thành giao diện `db` giống createPrismaDb (query + transaction).
 * Repository/service chạy trên adapter này trong test y hệt như chạy trên Prisma.
 */
function createPgliteDb(pg) {
  const wrap = (client, inTx) => {
    const db = {
      query: async (sql, params = []) => (await client.query(sql, params)).rows,
      transaction: inTx ? (fn) => fn(db) : (fn) => pg.transaction((tx) => fn(wrap(tx, true))),
    };
    return db;
  };
  return wrap(pg, false);
}

/** Mã SQLSTATE hay gặp. */
const SQLSTATE = Object.freeze({
  UNIQUE: '23505',
  FOREIGN_KEY: '23503',
  CHECK: '23514',
  RESTRICT: '23001',
  NOT_NULL: '23502',
});

/** Khẳng định câu lệnh SQL bị DB từ chối với đúng SQLSTATE (và tùy chọn khớp thông điệp). */
async function expectDbError(promise, code, messagePattern) {
  await assert.rejects(promise, (err) => {
    const codes = Array.isArray(code) ? code : [code];
    assert.ok(
      codes.includes(err.code),
      `Mong đợi SQLSTATE ${codes.join('|')}, nhận ${err.code}: ${err.message}`,
    );
    if (messagePattern) assert.match(err.message, messagePattern);
    return true;
  });
}

module.exports = { migratedDb, createPgliteDb, expectDbError, SQLSTATE };
