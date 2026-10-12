'use strict';

/**
 * Smoke test ĐẦU-CUỐI cho Identity, chạy trên hệ thống THẬT qua API Gateway
 * (Gateway -> Identity -> Prisma -> PostgreSQL trong Docker). Không cần cài thêm gói nào (Node >= 18).
 *
 * Chuẩn bị (một lần):
 *   docker compose up -d --build
 *   npm run db:seed -w services/identity        # tạo Admin đầu tiên (xem SEED_ADMIN_* trong .env)
 *
 * Chạy:
 *   node scripts/smoke-identity.js
 *
 * Biến môi trường tùy chọn:
 *   SMOKE_BASE_URL        mặc định http://localhost:8080
 *   SMOKE_ADMIN_EMAIL     mặc định admin@example.com
 *   SMOKE_ADMIN_PASSWORD  mặc định ChangeMe123
 *
 * Mỗi lần chạy tạo vài người dùng mới (email ngẫu nhiên, hậu tố @smoke.test); BR-15 không cho xóa nên
 * chúng được vô hiệu hóa ở cuối. Có thể bỏ qua hoặc dọn bằng `docker compose down -v` khi cần.
 */
const BASE =
  (process.env.SMOKE_BASE_URL || 'http://localhost:8080').replace(/\/$/, '') + '/api/identity';
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || 'ChangeMe123';
const RUN = Date.now().toString(36);

let passed = 0;
let failed = 0;

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`);
  }
  return condition;
}

const show = (r) => `HTTP ${r.status} ${JSON.stringify(r.body)}`;

async function main() {
  console.log(`Smoke test Identity qua ${BASE}\n`);

  console.log('1. Đăng nhập Admin (đã seed)');
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!check('đăng nhập Admin thành công', adminLogin.status === 200, show(adminLogin))) {
    console.log(
      '\nKhông đăng nhập được Admin. Đã chạy `npm run db:seed -w services/identity` chưa? Đúng SMOKE_ADMIN_* chưa?',
    );
    process.exit(1);
  }
  const admin = adminLogin.body;
  check(
    'vai trò là ADMIN và có access/refresh token',
    admin.user.role === 'ADMIN' && admin.accessToken && admin.refreshToken,
  );

  console.log('\n2. Khách hàng: đăng ký, đăng nhập, hồ sơ');
  const email = `khach-${RUN}@smoke.test`;
  const password = 'MatKhau12345';
  const reg = await api('/auth/register', {
    method: 'POST',
    body: { name: 'Khách Smoke', email: email.toUpperCase(), password },
  });
  check(
    'đăng ký trả 201, vai trò CUSTOMER, email chuẩn hóa',
    reg.status === 201 && reg.body.role === 'CUSTOMER' && reg.body.email === email,
    show(reg),
  );
  check(
    'đăng ký trùng email trả 409',
    (await api('/auth/register', { method: 'POST', body: { name: 'Trùng', email, password } }))
      .status === 409,
  );
  check(
    'đăng ký kèm role=ADMIN bị từ chối 422',
    (
      await api('/auth/register', {
        method: 'POST',
        body: { name: 'X', email: `x-${RUN}@smoke.test`, password, role: 'ADMIN' },
      })
    ).status === 422,
  );

  const login = await api('/auth/login', { method: 'POST', body: { email, password } });
  check('đăng nhập khách trả 200', login.status === 200, show(login));
  const customer = login.body;
  check(
    'sai mật khẩu trả 401',
    (await api('/auth/login', { method: 'POST', body: { email, password: 'SaiMatKhau99' } }))
      .status === 401,
  );

  const me = await api('/me', { token: customer.accessToken });
  check(
    'GET /me trả đúng hồ sơ',
    me.status === 200 && me.body.email === email && !('passwordHash' in me.body),
    show(me),
  );
  const patched = await api('/me', {
    method: 'PATCH',
    token: customer.accessToken,
    body: { name: 'Khách Đã Sửa', phone: '0901234567' },
  });
  check(
    'PATCH /me sửa được tên và số điện thoại',
    patched.status === 200 && patched.body.name === 'Khách Đã Sửa',
    show(patched),
  );
  check(
    'PATCH /me không cho sửa vai trò (422)',
    (await api('/me', { method: 'PATCH', token: customer.accessToken, body: { role: 'ADMIN' } }))
      .status === 422,
  );
  check('không token => 401', (await api('/me')).status === 401);

  console.log('\n3. Làm mới và thu hồi token');
  const r1 = await api('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: customer.refreshToken },
  });
  check(
    'refresh trả cặp token mới',
    r1.status === 200 && r1.body.refreshToken && r1.body.refreshToken !== customer.refreshToken,
    show(r1),
  );
  check(
    'access token mới dùng được',
    (await api('/me', { token: r1.body.accessToken })).status === 200,
  );
  const reuse = await api('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: customer.refreshToken },
  });
  check('dùng lại refresh token cũ bị từ chối 401', reuse.status === 401, show(reuse));
  check(
    '...và toàn bộ phiên bị thu hồi (token mới cũng chết)',
    (await api('/auth/refresh', { method: 'POST', body: { refreshToken: r1.body.refreshToken } }))
      .status === 401,
  );

  const s2 = (await api('/auth/login', { method: 'POST', body: { email, password } })).body;
  check(
    'logout trả 204',
    (await api('/auth/logout', { method: 'POST', body: { refreshToken: s2.refreshToken } }))
      .status === 204,
  );
  check(
    'sau logout refresh bị từ chối',
    (await api('/auth/refresh', { method: 'POST', body: { refreshToken: s2.refreshToken } }))
      .status === 401,
  );

  console.log('\n4. Phân quyền /users');
  const s3 = (await api('/auth/login', { method: 'POST', body: { email, password } })).body;
  check(
    'CUSTOMER gọi /users bị 403',
    (await api('/users', { token: s3.accessToken })).status === 403,
  );
  check('không token gọi /users bị 401', (await api('/users')).status === 401);

  console.log('\n5. Admin quản lý người dùng');
  const list = await api('/users?limit=5', { token: admin.accessToken });
  check(
    'GET /users phân trang',
    list.status === 200 &&
      Array.isArray(list.body.items) &&
      list.body.total >= 2 &&
      list.body.limit === 5,
    show(list),
  );
  const found = await api(`/users?q=${encodeURIComponent(`khach-${RUN}`)}`, {
    token: admin.accessToken,
  });
  check('tìm kiếm theo email', found.status === 200 && found.body.total === 1, show(found));

  const opEmail = `vanhanh-${RUN}@smoke.test`;
  const created = await api('/users', {
    method: 'POST',
    token: admin.accessToken,
    body: { name: 'Vận Hành Smoke', email: opEmail, password, role: 'OPERATOR' },
  });
  check(
    'Admin tạo Operator (201)',
    created.status === 201 && created.body.role === 'OPERATOR',
    show(created),
  );
  const op = created.body;
  check(
    'Operator đăng nhập được',
    (await api('/auth/login', { method: 'POST', body: { email: opEmail, password } })).status ===
      200,
  );
  check(
    'GET /users/:id',
    (await api(`/users/${op.id}`, { token: admin.accessToken })).status === 200,
  );
  check(
    'GET /users/:id không tồn tại => 404',
    (await api('/users/00000000-0000-4000-8000-000000000000', { token: admin.accessToken }))
      .status === 404,
  );
  const upd = await api(`/users/${op.id}`, {
    method: 'PATCH',
    token: admin.accessToken,
    body: { name: 'Vận Hành Đã Sửa' },
  });
  check('PATCH /users/:id', upd.status === 200 && upd.body.name === 'Vận Hành Đã Sửa', show(upd));

  const deact = await api(`/users/${op.id}/deactivate`, {
    method: 'POST',
    token: admin.accessToken,
  });
  check(
    'vô hiệu hóa => INACTIVE',
    deact.status === 200 && deact.body.status === 'INACTIVE',
    show(deact),
  );
  const blocked = await api('/auth/login', { method: 'POST', body: { email: opEmail, password } });
  check(
    'người bị vô hiệu hóa đăng nhập => 403 ACCOUNT_DISABLED',
    blocked.status === 403 && blocked.body.error.code === 'ACCOUNT_DISABLED',
    show(blocked),
  );
  check(
    'kích hoạt lại',
    (await api(`/users/${op.id}/activate`, { method: 'POST', token: admin.accessToken })).status ===
      200,
  );
  check(
    'reset mật khẩu => 204',
    (
      await api(`/users/${op.id}/reset-password`, {
        method: 'POST',
        token: admin.accessToken,
        body: { newPassword: 'MatKhauMoi12345' },
      })
    ).status === 204,
  );
  check(
    'mật khẩu mới đăng nhập được',
    (
      await api('/auth/login', {
        method: 'POST',
        body: { email: opEmail, password: 'MatKhauMoi12345' },
      })
    ).status === 200,
  );
  const self = await api(`/users/${admin.user.id}/deactivate`, {
    method: 'POST',
    token: admin.accessToken,
  });
  check(
    'Admin không tự vô hiệu hóa mình (409)',
    self.status === 409 && self.body.error.code === 'INVALID_STATE',
    show(self),
  );

  console.log('\n6. Khóa tạm khi sai mật khẩu nhiều lần');
  const lockEmail = `khoa-${RUN}@smoke.test`;
  await api('/auth/register', {
    method: 'POST',
    body: { name: 'Khóa Smoke', email: lockEmail, password },
  });
  let last;
  for (let i = 0; i < 5; i += 1)
    last = await api('/auth/login', {
      method: 'POST',
      body: { email: lockEmail, password: 'Sai12345678' },
    });
  check(
    'sai 5 lần => 423 ACCOUNT_LOCKED',
    last.status === 423 && last.body.error.code === 'ACCOUNT_LOCKED',
    show(last),
  );
  check(
    'đang khóa: mật khẩu đúng cũng bị 423',
    (await api('/auth/login', { method: 'POST', body: { email: lockEmail, password } })).status ===
      423,
  );

  // Dọn: vô hiệu hóa các tài khoản thử nghiệm
  for (const e of [email, opEmail, lockEmail]) {
    const u = await api(`/users?q=${encodeURIComponent(e)}`, { token: admin.accessToken });
    if (u.body && u.body.items && u.body.items[0])
      await api(`/users/${u.body.items[0].id}/deactivate`, {
        method: 'POST',
        token: admin.accessToken,
      });
  }

  console.log(`\nKết quả: ${passed} đạt, ${failed} lỗi`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nLỗi không mong đợi:', err.message);
  console.error('Gateway và Identity đã chạy chưa? (docker compose ps)');
  process.exit(1);
});
