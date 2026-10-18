'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPrismaDb, sqlState, isUniqueViolation, escapeLike } = require('../src');

/** Prisma giả: ghi lại lệnh gọi để kiểm tra cách adapter truyền tham số và giao dịch. */
function fakePrisma() {
  const calls = [];
  const client = (label) => ({
    $queryRawUnsafe: async (sql, ...params) => {
      calls.push({ label, sql, params });
      return [{ ok: 1 }];
    },
  });
  const prisma = {
    ...client('root'),
    $transaction: async (fn) => {
      calls.push({ label: 'BEGIN' });
      try {
        const out = await fn(client('tx'));
        calls.push({ label: 'COMMIT' });
        return out;
      } catch (err) {
        calls.push({ label: 'ROLLBACK' });
        throw err;
      }
    },
  };
  return { prisma, calls };
}

test('createPrismaDb.query: trải tham số vị trí cho $queryRawUnsafe', async () => {
  const { prisma, calls } = fakePrisma();
  const db = createPrismaDb(prisma);
  const rows = await db.query('SELECT $1, $2', ['a', 2]);
  assert.deepEqual(rows, [{ ok: 1 }]);
  assert.deepEqual(calls[0], { label: 'root', sql: 'SELECT $1, $2', params: ['a', 2] });
  await db.query('SELECT 1'); // không tham số
  assert.deepEqual(calls[1].params, []);
});

test('createPrismaDb.transaction: query bên trong đi qua client giao dịch, lỗi => ROLLBACK', async () => {
  const { prisma, calls } = fakePrisma();
  const db = createPrismaDb(prisma);
  await db.transaction(async (tx) => {
    await tx.query('UPDATE a');
    await tx.transaction(async (inner) => inner.query('UPDATE b')); // lồng nhau: dùng chung giao dịch
  });
  assert.deepEqual(
    calls.map((c) => c.label),
    ['BEGIN', 'tx', 'tx', 'COMMIT'],
  );

  calls.length = 0;
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.query('UPDATE a');
      throw new Error('hỏng');
    }),
    /hỏng/,
  );
  assert.deepEqual(
    calls.map((c) => c.label),
    ['BEGIN', 'tx', 'ROLLBACK'],
  );
});

test('sqlState nhận diện SQLSTATE từ cả hai nguồn lỗi', () => {
  assert.equal(sqlState({ code: '23505' }), '23505'); // driver trực tiếp (PGlite)
  assert.equal(sqlState({ code: 'P2010', meta: { code: '23514' } }), '23514'); // Prisma raw
  assert.equal(sqlState({ code: 'P2002' }), undefined); // mã Prisma khác không phải SQLSTATE
  assert.equal(sqlState(new Error('x')), undefined);
  assert.equal(sqlState(undefined), undefined);
  assert.equal(isUniqueViolation({ code: '23505' }), true);
  assert.equal(isUniqueViolation({ code: 'P2002' }), true);
  assert.equal(isUniqueViolation({ code: '23514' }), false);
});

test('escapeLike vô hiệu hóa ký tự đại diện', () => {
  assert.equal(escapeLike('50%_off\\'), '50\\%\\_off\\\\');
  assert.equal(escapeLike('an'), 'an');
});
