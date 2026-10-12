'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { setupApp, decode } = require('./helpers');

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

test('Auth: đăng ký (FR-03)', async (t) => {
  const { api, base, db } = await setupApp(t);
  const register = (body) => api('/auth/register', { method: 'POST', body });

  await t.test('thành công: 201, CUSTOMER, email chuẩn hóa, không lộ trường nhạy cảm', async () => {
    const r = await register({
      name: '  An  ',
      email: '  An@Example.COM ',
      password: 'Password123',
      phone: '0901234567',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.email, 'an@example.com');
    assert.equal(r.body.name, 'An');
    assert.equal(r.body.role, 'CUSTOMER');
    assert.equal(r.body.status, 'ACTIVE');
    assert.equal(r.body.phone, '0901234567');
    assert.match(r.body.id, /^[0-9a-f-]{36}$/);
    for (const key of [
      'password',
      'passwordHash',
      'password_hash',
      'failedLoginCount',
      'lockedUntil',
    ]) {
      assert.ok(!(key in r.body), `không được trả ${key}`);
    }
    const rows = await db.query(`SELECT password_hash FROM users WHERE email = 'an@example.com'`);
    assert.match(rows[0].password_hash, /^\$2[aby]\$/, 'mật khẩu phải được băm bằng bcrypt');
  });

  await t.test('email trùng (kể cả khác hoa/thường) => 409', async () => {
    const r = await register({ name: 'An 2', email: 'AN@example.com', password: 'Password123' });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'CONFLICT');
  });

  await t.test('không tự cấp quyền: gửi role/status => 422', async () => {
    for (const extra of [{ role: 'ADMIN' }, { status: 'ACTIVE' }, { id: 'x' }]) {
      const r = await register({
        name: 'Hacker',
        email: `h${Math.random()}@example.com`,
        password: 'Password123',
        ...extra,
      });
      assert.equal(r.status, 422, JSON.stringify(extra));
      assert.equal(r.body.error.code, 'VALIDATION_ERROR');
    }
  });

  await t.test('kiểm tra đầu vào: mật khẩu, email, họ tên, số điện thoại', async () => {
    const ok = { name: 'Bình', email: 'binh@example.com', password: 'Password123' };
    const cases = [
      [{ ...ok, password: 'short' }, 'password'],
      [{ ...ok, password: 'ế'.repeat(25) }, 'password'], // 75 byte > 72 (bcrypt cắt cụt, nên phải chặn)
      [{ ...ok, email: 'khong-phai-email' }, 'email'],
      [{ ...ok, name: '   ' }, 'name'],
      [{ ...ok, phone: 'abc' }, 'phone'],
    ];
    for (const [body, field] of cases) {
      const r = await register(body);
      assert.equal(r.status, 422, field);
      assert.ok(
        r.body.error.details.some((d) => d.path === field),
        `details phải chỉ ra trường ${field}`,
      );
    }
    assert.equal((await register({ ...ok, password: 'a'.repeat(72) })).status, 201); // đúng 72 byte: được
  });

  await t.test('body không phải JSON hợp lệ => 400 BAD_REQUEST', async () => {
    const res = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{hỏng',
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'BAD_REQUEST');
  });
});

test('Auth: đăng nhập (FR-02, UC-01)', async (t) => {
  const { api, db, clock, makeUser } = await setupApp(t);
  const login = (email, password) =>
    api('/auth/login', { method: 'POST', body: { email, password } });

  await t.test(
    'thành công: trả JWT hợp lệ, refresh token, hồ sơ; ghi nhận lastLoginAt',
    async () => {
      const u = await makeUser({ name: 'Cường', role: 'OPERATOR' });
      const r = await login(u.email.toUpperCase(), u.password); // email không phân biệt hoa/thường
      assert.equal(r.status, 200);
      const payload = decode(r.body.accessToken);
      assert.equal(payload.sub, u.id);
      assert.equal(payload.role, 'OPERATOR');
      assert.equal(payload.name, 'Cường');
      assert.equal(r.body.expiresIn, 3600);
      assert.ok(r.body.refreshToken.length >= 60);
      assert.equal(r.body.user.email, u.email);
      assert.ok(r.body.user.lastLoginAt);
      assert.ok(!('passwordHash' in r.body.user));

      // refresh token chỉ được lưu dạng băm
      const rows = await db.query('SELECT token_hash FROM refresh_tokens');
      assert.ok(
        rows.every(
          (x) => x.token_hash !== r.body.refreshToken && /^[0-9a-f]{64}$/.test(x.token_hash),
        ),
      );
    },
  );

  await t.test(
    'sai mật khẩu và email không tồn tại cho CÙNG một phản hồi (không lộ email nào có thật)',
    async () => {
      const u = await makeUser();
      const wrongPassword = await login(u.email, 'SaiMatKhau1');
      const unknownEmail = await login('khong-ton-tai@example.com', 'SaiMatKhau1');
      assert.equal(wrongPassword.status, 401);
      assert.equal(unknownEmail.status, 401);
      assert.equal(wrongPassword.body.error.code, unknownEmail.body.error.code);
      assert.equal(wrongPassword.body.error.message, unknownEmail.body.error.message);
    },
  );

  await t.test(
    'sai 5 lần liên tiếp => khóa 5 phút (423); đúng mật khẩu khi đang khóa vẫn bị từ chối',
    async () => {
      const u = await makeUser();
      for (let i = 1; i <= 4; i += 1)
        assert.equal((await login(u.email, 'Sai1234567')).status, 401, `lần ${i}`);
      const fifth = await login(u.email, 'Sai1234567');
      assert.equal(fifth.status, 423);
      assert.equal(fifth.body.error.code, 'ACCOUNT_LOCKED');
      assert.ok(
        fifth.body.error.details.retryAfterSeconds > 290 &&
          fifth.body.error.details.retryAfterSeconds <= 300,
      );

      const whileLocked = await login(u.email, u.password); // mật khẩu ĐÚNG nhưng đang khóa
      assert.equal(whileLocked.status, 423);

      clock.advance(5 * MINUTE + 1000); // hết thời gian khóa
      const after = await login(u.email, u.password);
      assert.equal(after.status, 200);
      const [row] = await db.query(
        `SELECT failed_login_count, locked_until FROM users WHERE id = $1::text::uuid`,
        [u.id],
      );
      assert.equal(row.failed_login_count, 0);
      assert.equal(row.locked_until, null);
    },
  );

  await t.test(
    'đăng nhập đúng đặt lại bộ đếm sai (sai 3, đúng 1, sai 4 => vẫn chưa khóa)',
    async () => {
      const u = await makeUser();
      for (let i = 0; i < 3; i += 1) await login(u.email, 'Sai1234567');
      assert.equal((await login(u.email, u.password)).status, 200);
      for (let i = 0; i < 4; i += 1) assert.equal((await login(u.email, 'Sai1234567')).status, 401);
    },
  );

  await t.test(
    'tài khoản bị vô hiệu hóa: mật khẩu đúng => 403; mật khẩu sai => 401 (không lộ trạng thái)',
    async () => {
      const u = await makeUser({ status: 'INACTIVE' });
      const right = await login(u.email, u.password);
      assert.equal(right.status, 403);
      assert.equal(right.body.error.code, 'ACCOUNT_DISABLED');
      assert.equal((await login(u.email, 'Sai1234567')).status, 401);
    },
  );

  await t.test(
    'kiểm tra đầu vào: thiếu trường / email sai định dạng / trường lạ => 422',
    async () => {
      for (const body of [
        {},
        { email: 'a@b.co' },
        { email: 'khong', password: 'x' },
        { email: 'a@b.co', password: 'x', role: 'ADMIN' },
      ]) {
        assert.equal(
          (await api('/auth/login', { method: 'POST', body })).status,
          422,
          JSON.stringify(body),
        );
      }
    },
  );
});

test('Auth: làm mới và thu hồi token (BR-16)', async (t) => {
  const { api, db, clock, makeUser, login } = await setupApp(t);
  const refresh = (refreshToken) =>
    api('/auth/refresh', { method: 'POST', body: { refreshToken } });

  await t.test('xoay vòng: mỗi lần dùng cho token mới; token mới dùng tiếp được', async () => {
    const u = await makeUser();
    const s0 = await login(u.email);
    const r1 = await refresh(s0.refreshToken);
    assert.equal(r1.status, 200);
    assert.notEqual(r1.body.refreshToken, s0.refreshToken);
    assert.equal(decode(r1.body.accessToken).sub, u.id);
    assert.equal(r1.body.expiresIn, 3600);
    const r2 = await refresh(r1.body.refreshToken);
    assert.equal(r2.status, 200);
    const me = await api('/me', { token: r2.body.accessToken });
    assert.equal(me.status, 200);
  });

  await t.test(
    'dùng lại token ĐÃ XOAY => 401 và thu hồi TOÀN BỘ phiên (nghi bị đánh cắp)',
    async () => {
      const u = await makeUser();
      const s0 = await login(u.email);
      const other = await login(u.email); // phiên thứ hai (thiết bị khác)
      const r1 = await refresh(s0.refreshToken);
      assert.equal(r1.status, 200);

      assert.equal((await refresh(s0.refreshToken)).status, 401); // kẻ cắp dùng lại token cũ
      assert.equal((await refresh(r1.body.refreshToken)).status, 401); // token mới của chủ cũng bị thu hồi
      assert.equal((await refresh(other.refreshToken)).status, 401); // kể cả phiên ở thiết bị khác

      const [{ n }] = await db.query(
        `SELECT count(*)::int AS n FROM refresh_tokens WHERE user_id = $1::text::uuid AND revoked_at IS NULL`,
        [u.id],
      );
      assert.equal(n, 0);
    },
  );

  await t.test('hai request đồng thời cùng một token: đúng một request thành công', async () => {
    const u = await makeUser();
    const s0 = await login(u.email);
    const results = await Promise.all([refresh(s0.refreshToken), refresh(s0.refreshToken)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 401]);
  });

  await t.test('token lạ / thiếu / hết hạn => 401 hoặc 422', async () => {
    assert.equal((await refresh('khong-ton-tai')).status, 401);
    assert.equal((await api('/auth/refresh', { method: 'POST', body: {} })).status, 422);

    const u = await makeUser();
    const s0 = await login(u.email);
    clock.advance(8 * DAY); // refresh token sống 7 ngày
    assert.equal((await refresh(s0.refreshToken)).status, 401);
  });

  await t.test('tài khoản bị vô hiệu hóa: refresh => 403 và thu hồi hết token', async () => {
    const u = await makeUser();
    const s0 = await login(u.email);
    await db.query(`UPDATE users SET status = 'INACTIVE' WHERE id = $1::text::uuid RETURNING id`, [
      u.id,
    ]);
    const r = await refresh(s0.refreshToken);
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, 'ACCOUNT_DISABLED');
    assert.equal((await refresh(s0.refreshToken)).status, 401);
  });

  await t.test('vai trò mới có hiệu lực ở access token sau khi làm mới', async () => {
    const u = await makeUser({ role: 'CUSTOMER' });
    const s0 = await login(u.email);
    assert.equal(decode(s0.accessToken).role, 'CUSTOMER');
    await db.query(`UPDATE users SET role = 'OPERATOR' WHERE id = $1::text::uuid RETURNING id`, [
      u.id,
    ]);
    const r = await refresh(s0.refreshToken);
    assert.equal(decode(r.body.accessToken).role, 'OPERATOR');
  });

  await t.test(
    'đăng xuất: thu hồi token, idempotent, không lộ token có tồn tại hay không',
    async () => {
      const u = await makeUser();
      const s0 = await login(u.email);
      const out = await api('/auth/logout', {
        method: 'POST',
        body: { refreshToken: s0.refreshToken },
      });
      assert.equal(out.status, 204);
      assert.equal(out.body, null);
      assert.equal((await refresh(s0.refreshToken)).status, 401);
      assert.equal(
        (await api('/auth/logout', { method: 'POST', body: { refreshToken: 'khong-co' } })).status,
        204,
      );
      assert.equal((await api('/auth/logout', { method: 'POST', body: {} })).status, 422);
    },
  );
});

test('Health', async (t) => {
  const { api } = await setupApp(t);
  assert.equal((await api('/health')).status, 200);
  const ready = await api('/health/ready');
  assert.equal(ready.status, 200);
  assert.equal(ready.body.db, 'up');
});
