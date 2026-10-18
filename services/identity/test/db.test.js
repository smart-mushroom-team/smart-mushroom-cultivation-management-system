'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { migratedDb, expectDbError, SQLSTATE } = require('@mushroom/shared/testing/pglite');

test('Identity: migration áp dụng được và ràng buộc DB hoạt động', async (t) => {
  const db = await migratedDb('identity');
  t.after(() => db.close());

  const insertUser = (email, extra = '') =>
    db.query(
      `INSERT INTO users (name, email, password_hash) VALUES ('An', $1, 'hash') ${extra} RETURNING id, role, status, created_at`,
      [email],
    );

  await t.test('id do DB sinh, mặc định CUSTOMER + ACTIVE', async () => {
    const { rows } = await insertUser('an@example.com');
    assert.match(rows[0].id, /^[0-9a-f-]{36}$/);
    assert.equal(rows[0].role, 'CUSTOMER');
    assert.equal(rows[0].status, 'ACTIVE');
  });

  await t.test('email trùng bị chặn', async () => {
    await insertUser('trung@example.com');
    await expectDbError(insertUser('trung@example.com'), SQLSTATE.UNIQUE);
  });

  await t.test('email phải lưu chữ thường (tránh trùng khác hoa/thường)', async () => {
    await expectDbError(
      insertUser('HoaThuong@Example.com'),
      SQLSTATE.CHECK,
      /chk_users_email_lowercase/,
    );
  });

  await t.test('BR-15: không xóa người dùng', async () => {
    await insertUser('xoa@example.com');
    await expectDbError(
      db.query(`DELETE FROM users WHERE email = 'xoa@example.com'`),
      SQLSTATE.RESTRICT,
    );
  });

  await t.test('updated_at tự cập nhật kể cả khi UPDATE bằng raw SQL', async () => {
    const { rows } = await insertUser('capnhat@example.com');
    await new Promise((r) => setTimeout(r, 15));
    const res = await db.query(
      `UPDATE users SET name = 'Tên mới' WHERE id = $1 RETURNING updated_at > created_at AS changed`,
      [rows[0].id],
    );
    assert.equal(res.rows[0].changed, true);
  });

  await t.test(
    'refresh token: cần người dùng tồn tại, hash duy nhất, hạn phải sau thời điểm tạo',
    async () => {
      const { rows } = await insertUser('token@example.com');
      const uid = rows[0].id;
      const ins = (userId, hash, exp = `now() + interval '7 days'`) =>
        db.query(
          `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, ${exp})`,
          [userId, hash],
        );
      await ins(uid, 'h1');
      await expectDbError(ins(uid, 'h1'), SQLSTATE.UNIQUE);
      await expectDbError(ins('00000000-0000-0000-0000-000000000000', 'h2'), SQLSTATE.FOREIGN_KEY);
      await expectDbError(ins(uid, 'h3', `now() - interval '1 day'`), SQLSTATE.CHECK);
    },
  );
});
