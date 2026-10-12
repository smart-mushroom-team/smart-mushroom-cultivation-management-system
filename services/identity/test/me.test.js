'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { setupApp } = require('./helpers');

test('Hồ sơ cá nhân /me (FR-05)', async (t) => {
  const { api, makeLoggedIn, makeUser, login } = await setupApp(t);
  const me = await makeLoggedIn({ name: 'Dũng', role: 'CUSTOMER' });

  await t.test('cần đăng nhập: thiếu hoặc sai token => 401', async () => {
    assert.equal((await api('/me')).status, 401);
    assert.equal((await api('/me', { token: 'khong.phai.jwt' })).status, 401);
    assert.equal((await api('/me', { method: 'PATCH', body: { name: 'X' } })).status, 401);
  });

  await t.test('xem hồ sơ: đúng của người trong token, không lộ trường nhạy cảm', async () => {
    const r = await api('/me', { token: me.token });
    assert.equal(r.status, 200);
    assert.equal(r.body.id, me.id);
    assert.equal(r.body.email, me.email);
    assert.equal(r.body.name, 'Dũng');
    assert.ok(!('passwordHash' in r.body));
  });

  await t.test('sửa họ tên, số điện thoại, địa chỉ; có thể xóa bằng null', async () => {
    let r = await api('/me', {
      method: 'PATCH',
      token: me.token,
      body: { name: '  Dũng Mới  ', phone: '+84 90 123 4567', address: '12 Nguyễn Huệ, Q1' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.name, 'Dũng Mới');
    assert.equal(r.body.phone, '+84 90 123 4567');
    assert.equal(r.body.address, '12 Nguyễn Huệ, Q1');

    r = await api('/me', { method: 'PATCH', token: me.token, body: { phone: null } });
    assert.equal(r.body.phone, null);
    assert.equal(r.body.name, 'Dũng Mới', 'trường không gửi thì giữ nguyên');
  });

  await t.test('KHÔNG sửa được email, vai trò, trạng thái, mật khẩu qua /me (422)', async () => {
    for (const body of [
      { email: 'moi@example.com' },
      { role: 'ADMIN' },
      { status: 'INACTIVE' },
      { password: 'Password999' },
      {},
    ]) {
      const r = await api('/me', { method: 'PATCH', token: me.token, body });
      assert.equal(r.status, 422, JSON.stringify(body));
    }
    const after = await api('/me', { token: me.token });
    assert.equal(after.body.role, 'CUSTOMER');
    assert.equal(after.body.email, me.email);
  });

  await t.test('dữ liệu sai => 422 và không làm thay đổi hồ sơ', async () => {
    for (const body of [{ name: '' }, { phone: 'abc' }, { address: 'x'.repeat(300) }]) {
      assert.equal((await api('/me', { method: 'PATCH', token: me.token, body })).status, 422);
    }
  });

  await t.test('mỗi người chỉ sửa được hồ sơ của mình', async () => {
    const other = await makeUser({ name: 'Người Khác' });
    await api('/me', { method: 'PATCH', token: me.token, body: { name: 'Dũng Lần Hai' } });
    const session = await login(other.email, other.password);
    const otherProfile = await api('/me', { token: session.accessToken });
    assert.equal(otherProfile.body.name, 'Người Khác');
  });
});
