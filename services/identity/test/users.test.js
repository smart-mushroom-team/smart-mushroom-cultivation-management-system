'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { setupApp } = require('./helpers');

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

test('Quản lý người dùng /users (FR-04) — chỉ ADMIN', async (t) => {
  const ctx = await setupApp(t);
  const { api, db, makeUser, makeLoggedIn, login } = ctx;
  const admin = await makeLoggedIn({ name: 'Quản Trị', role: 'ADMIN' });
  const A = (path, opts = {}) => api(path, { token: admin.token, ...opts });

  await t.test(
    'phân quyền: không token 401; CUSTOMER 403; OPERATOR 403 (Operator không được quản lý người dùng)',
    async () => {
      const customer = await makeLoggedIn({ role: 'CUSTOMER' });
      const operator = await makeLoggedIn({ role: 'OPERATOR' });
      for (const [method, path] of [
        ['GET', '/users'],
        ['POST', '/users'],
        ['GET', `/users/${MISSING_ID}`],
        ['PATCH', `/users/${MISSING_ID}`],
        ['POST', `/users/${MISSING_ID}/deactivate`],
        ['POST', `/users/${MISSING_ID}/activate`],
        ['POST', `/users/${MISSING_ID}/reset-password`],
      ]) {
        assert.equal((await api(path, { method })).status, 401, `${method} ${path} không token`);
        assert.equal(
          (await api(path, { method, token: customer.token })).status,
          403,
          `${method} ${path} CUSTOMER`,
        );
        assert.equal(
          (await api(path, { method, token: operator.token })).status,
          403,
          `${method} ${path} OPERATOR`,
        );
      }
    },
  );

  await t.test(
    'tạo người dùng với vai trò bất kỳ; người đó đăng nhập được; email trùng 409',
    async () => {
      const r = await A('/users', {
        method: 'POST',
        body: {
          name: 'Vận Hành',
          email: 'Operator1@Example.com',
          password: 'Password123',
          role: 'OPERATOR',
        },
      });
      assert.equal(r.status, 201);
      assert.equal(r.body.role, 'OPERATOR');
      assert.equal(r.body.email, 'operator1@example.com');
      assert.ok(!('passwordHash' in r.body));
      assert.equal((await login('operator1@example.com', 'Password123')).user.role, 'OPERATOR');

      const dup = await A('/users', {
        method: 'POST',
        body: {
          name: 'X',
          email: 'operator1@example.com',
          password: 'Password123',
          role: 'CUSTOMER',
        },
      });
      assert.equal(dup.status, 409);
    },
  );

  await t.test('tạo người dùng: dữ liệu sai => 422', async () => {
    const ok = { name: 'Y', email: 'y@example.com', password: 'Password123', role: 'CUSTOMER' };
    for (const bad of [
      { ...ok, role: 'SUPERUSER' },
      { ...ok, password: '123' },
      { ...ok, email: 'x' },
      { name: 'Z' },
      { ...ok, status: 'ACTIVE' },
    ]) {
      assert.equal(
        (await A('/users', { method: 'POST', body: bad })).status,
        422,
        JSON.stringify(bad),
      );
    }
  });

  await t.test('danh sách: phân trang, lọc theo vai trò/trạng thái, tìm kiếm', async () => {
    const before = (await A('/users?limit=100')).body.total;
    await makeUser({ name: 'Lan Anh', email: 'lananh.list@example.com', role: 'CUSTOMER' });
    await makeUser({
      name: 'Minh Tâm',
      email: 'minhtam.list@example.com',
      role: 'CUSTOMER',
      status: 'INACTIVE',
    });
    await makeUser({ name: 'Nam Phong', email: 'namphong.list@example.com', role: 'OPERATOR' });

    const all = await A('/users?limit=100');
    assert.equal(all.status, 200);
    assert.equal(all.body.total, before + 3);
    assert.equal(all.body.page, 1);
    assert.equal(all.body.limit, 100);
    assert.ok(all.body.items.every((u) => !('passwordHash' in u)));

    const page2 = await A('/users?limit=2&page=2');
    assert.equal(page2.body.items.length, 2);
    assert.equal(page2.body.total, before + 3);
    const page1 = await A('/users?limit=2&page=1');
    assert.equal(
      new Set([...page1.body.items, ...page2.body.items].map((u) => u.id)).size,
      4,
      'hai trang không trùng nhau',
    );

    assert.ok((await A('/users?role=OPERATOR')).body.items.every((u) => u.role === 'OPERATOR'));
    const inactive = (await A('/users?status=INACTIVE')).body.items;
    assert.ok(inactive.length >= 1 && inactive.every((u) => u.status === 'INACTIVE'));
    assert.equal(
      (await A('/users?q=LAN%20ANH')).body.items.filter(
        (u) => u.email === 'lananh.list@example.com',
      ).length,
      1,
    ); // không phân biệt hoa/thường
    assert.equal((await A('/users?q=namphong.list@')).body.items.length, 1); // tìm theo email

    const none = await A('/users?role=CUSTOMER&status=INACTIVE&q=khong-co-ai-ten-nay');
    assert.deepEqual(none.body.items, []);
    assert.equal(none.body.total, 0);
  });

  await t.test(
    'tìm kiếm an toàn: % và _ hiểu theo nghĩa đen; dấu nháy/SQL injection không gây lỗi',
    async () => {
      const wildcard = await A('/users?q=%25'); // q=%
      assert.equal(wildcard.status, 200);
      assert.equal(wildcard.body.total, 0, 'ký tự % không được hiểu là "khớp tất cả"');
      const underscore = await A('/users?q=_');
      assert.equal(underscore.body.total, 0);
      const injection = await A(`/users?q=${encodeURIComponent("'; DROP TABLE users; --")}`);
      assert.equal(injection.status, 200);
      assert.equal(
        (await db.query('SELECT count(*)::int AS n FROM users'))[0].n > 0,
        true,
        'bảng users vẫn còn',
      );
    },
  );

  await t.test('danh sách: tham số sai => 422', async () => {
    for (const q of ['limit=1000', 'limit=0', 'page=0', 'page=abc', 'role=KHAC', 'status=KHAC']) {
      assert.equal((await A(`/users?${q}`)).status, 422, q);
    }
  });

  await t.test('xem chi tiết: có, không có (404), sai định dạng id (422)', async () => {
    const u = await makeUser({ name: 'Chi Tiết' });
    const r = await A(`/users/${u.id}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.name, 'Chi Tiết');
    assert.equal((await A(`/users/${MISSING_ID}`)).status, 404);
    assert.equal((await A('/users/khong-phai-uuid')).status, 422);
  });

  await t.test(
    'sửa: họ tên, vai trò, số điện thoại; không sửa email/mật khẩu/trạng thái; rỗng => 422',
    async () => {
      const u = await makeUser({ name: 'Sửa Tên' });
      const r = await A(`/users/${u.id}`, {
        method: 'PATCH',
        body: { name: 'Tên Mới', role: 'OPERATOR', phone: '0912345678' },
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.name, 'Tên Mới');
      assert.equal(r.body.role, 'OPERATOR');
      assert.equal(r.body.phone, '0912345678');
      for (const body of [
        { email: 'x@example.com' },
        { password: 'Password123' },
        { status: 'INACTIVE' },
        {},
      ]) {
        assert.equal(
          (await A(`/users/${u.id}`, { method: 'PATCH', body })).status,
          422,
          JSON.stringify(body),
        );
      }
      assert.equal(
        (await A(`/users/${MISSING_ID}`, { method: 'PATCH', body: { name: 'X' } })).status,
        404,
      );
    },
  );

  await t.test(
    'vô hiệu hóa: thu hồi mọi phiên, không đăng nhập được, idempotent, không xóa dữ liệu (BR-15)',
    async () => {
      const u = await makeLoggedIn({ name: 'Bị Khóa' });
      const r = await A(`/users/${u.id}/deactivate`, { method: 'POST' });
      assert.equal(r.status, 200);
      assert.equal(r.body.status, 'INACTIVE');

      assert.equal(
        (await api('/auth/refresh', { method: 'POST', body: { refreshToken: u.refreshToken } }))
          .status,
        401,
      );
      const attempt = await api('/auth/login', {
        method: 'POST',
        body: { email: u.email, password: u.password },
      });
      assert.equal(attempt.status, 403);
      assert.equal(attempt.body.error.code, 'ACCOUNT_DISABLED');

      assert.equal((await A(`/users/${u.id}/deactivate`, { method: 'POST' })).status, 200); // lần hai vẫn 200
      assert.equal((await A(`/users/${u.id}`)).body.status, 'INACTIVE'); // vẫn tồn tại
      assert.equal((await A(`/users/${MISSING_ID}/deactivate`, { method: 'POST' })).status, 404);
    },
  );

  await t.test('Admin không tự vô hiệu hóa chính mình (409 INVALID_STATE)', async () => {
    const r = await A(`/users/${admin.id}/deactivate`, { method: 'POST' });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'INVALID_STATE');
  });

  await t.test('kích hoạt lại: đăng nhập được và gỡ khóa tạm', async () => {
    const u = await makeUser({ name: 'Bị Khóa Tạm' });
    for (let i = 0; i < 5; i += 1)
      await api('/auth/login', {
        method: 'POST',
        body: { email: u.email, password: 'Sai1234567' },
      });
    assert.equal(
      (await api('/auth/login', { method: 'POST', body: { email: u.email, password: u.password } }))
        .status,
      423,
    );

    await A(`/users/${u.id}/deactivate`, { method: 'POST' });
    const r = await A(`/users/${u.id}/activate`, { method: 'POST' });
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'ACTIVE');
    assert.equal(
      (await api('/auth/login', { method: 'POST', body: { email: u.email, password: u.password } }))
        .status,
      200,
    );
    assert.equal((await A(`/users/${MISSING_ID}/activate`, { method: 'POST' })).status, 404);
  });

  await t.test(
    'đặt lại mật khẩu: mật khẩu cũ vô hiệu, mới dùng được, thu hồi phiên, gỡ khóa',
    async () => {
      const u = await makeLoggedIn({ name: 'Quên Mật Khẩu' });
      for (let i = 0; i < 5; i += 1)
        await api('/auth/login', {
          method: 'POST',
          body: { email: u.email, password: 'Sai1234567' },
        });

      const r = await A(`/users/${u.id}/reset-password`, {
        method: 'POST',
        body: { newPassword: 'MatKhauMoi456' },
      });
      assert.equal(r.status, 204);

      assert.equal(
        (await api('/auth/refresh', { method: 'POST', body: { refreshToken: u.refreshToken } }))
          .status,
        401,
      );
      assert.equal(
        (
          await api('/auth/login', {
            method: 'POST',
            body: { email: u.email, password: u.password },
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await api('/auth/login', {
            method: 'POST',
            body: { email: u.email, password: 'MatKhauMoi456' },
          })
        ).status,
        200,
      );

      assert.equal(
        (await A(`/users/${u.id}/reset-password`, { method: 'POST', body: { newPassword: '123' } }))
          .status,
        422,
      );
      assert.equal(
        (await A(`/users/${u.id}/reset-password`, { method: 'POST', body: {} })).status,
        422,
      );
      assert.equal(
        (
          await A(`/users/${MISSING_ID}/reset-password`, {
            method: 'POST',
            body: { newPassword: 'MatKhauMoi456' },
          })
        ).status,
        404,
      );
    },
  );
});

test('Luôn còn ít nhất một Admin đang hoạt động', async (t) => {
  const { api, db, makeLoggedIn } = await setupApp(t);
  const adminA = await makeLoggedIn({ name: 'Admin A', role: 'ADMIN' });
  const adminB = await makeLoggedIn({ name: 'Admin B', role: 'ADMIN' });
  const as =
    (who) =>
    (path, opts = {}) =>
      api(path, { token: who.token, ...opts });

  await t.test('Admin A hạ quyền Admin B được (vì A còn lại)', async () => {
    const r = await as(adminA)(`/users/${adminB.id}`, {
      method: 'PATCH',
      body: { role: 'OPERATOR' },
    });
    assert.equal(r.status, 200);
    await as(adminA)(`/users/${adminB.id}`, { method: 'PATCH', body: { role: 'ADMIN' } }); // trả lại
  });

  await t.test('Admin A vô hiệu hóa Admin B được; sau đó A là Admin cuối cùng', async () => {
    assert.equal(
      (await as(adminA)(`/users/${adminB.id}/deactivate`, { method: 'POST' })).status,
      200,
    );
  });

  await t.test('KHÔNG hạ quyền được Admin cuối cùng (kể cả tự hạ quyền chính mình)', async () => {
    const r = await as(adminA)(`/users/${adminA.id}`, {
      method: 'PATCH',
      body: { role: 'CUSTOMER' },
    });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'INVALID_STATE');
    const [{ role }] = await db.query(
      `SELECT role::text AS role FROM users WHERE id = $1::text::uuid`,
      [adminA.id],
    );
    assert.equal(role, 'ADMIN');
  });

  await t.test(
    'KHÔNG vô hiệu hóa được Admin cuối cùng dù người gọi là Admin khác (token cũ của B còn hạn)',
    async () => {
      // B đã bị vô hiệu hóa nhưng access token còn hạn tối đa 1 giờ (BR-16): B cố vô hiệu hóa A
      const r = await as(adminB)(`/users/${adminA.id}/deactivate`, { method: 'POST' });
      assert.equal(r.status, 409);
      assert.equal(r.body.error.code, 'INVALID_STATE');
    },
  );

  await t.test('kích hoạt lại Admin B thì lại hạ quyền/vô hiệu hóa được A', async () => {
    await as(adminA)(`/users/${adminB.id}/activate`, { method: 'POST' });
    assert.equal(
      (await as(adminB)(`/users/${adminA.id}/deactivate`, { method: 'POST' })).status,
      200,
    );
  });
});
