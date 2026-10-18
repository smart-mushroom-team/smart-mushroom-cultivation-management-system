'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  authenticate,
  requireRole,
  requireServiceKey,
  hasRole,
  signAccessToken,
  ROLES,
} = require('../src');

const SECRET = 'test-secret';

function run(mw, req) {
  return new Promise((resolve) => mw(req, {}, (err) => resolve(err)));
}

test('hasRole: Admin kế thừa quyền Operator nhưng không kế thừa quyền Customer', () => {
  assert.equal(hasRole(ROLES.ADMIN, [ROLES.OPERATOR]), true);
  assert.equal(hasRole(ROLES.OPERATOR, [ROLES.OPERATOR]), true);
  assert.equal(hasRole(ROLES.CUSTOMER, [ROLES.OPERATOR]), false);
  assert.equal(hasRole(ROLES.ADMIN, [ROLES.CUSTOMER]), false);
  assert.equal(hasRole(ROLES.OPERATOR, [ROLES.ADMIN]), false);
});

test('authenticate: token hợp lệ gắn req.user', async () => {
  const token = signAccessToken({ id: 'u1', role: ROLES.CUSTOMER, name: 'An' }, { secret: SECRET });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const err = await run(authenticate(SECRET), req);
  assert.equal(err, undefined);
  assert.deepEqual(req.user, { id: 'u1', role: 'CUSTOMER', name: 'An' });
});

test('authenticate: thiếu token hoặc sai khóa trả 401', async () => {
  const noToken = await run(authenticate(SECRET), { headers: {} });
  assert.equal(noToken.status, 401);

  const token = signAccessToken({ id: 'u1', role: ROLES.ADMIN, name: 'A' }, { secret: 'khac' });
  const wrongKey = await run(authenticate(SECRET), {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(wrongKey.status, 401);
});

test('authenticate: token hết hạn trả TOKEN_EXPIRED', async () => {
  const token = signAccessToken(
    { id: 'u1', role: ROLES.ADMIN, name: 'A' },
    { secret: SECRET, expiresIn: -10 },
  );
  const err = await run(authenticate(SECRET), { headers: { authorization: `Bearer ${token}` } });
  assert.equal(err.status, 401);
  assert.equal(err.code, 'TOKEN_EXPIRED');
});

test('requireRole: chặn đúng vai trò', async () => {
  const mw = requireRole(ROLES.OPERATOR);
  assert.equal(await run(mw, { user: { role: ROLES.OPERATOR } }), undefined);
  assert.equal(await run(mw, { user: { role: ROLES.ADMIN } }), undefined);
  assert.equal((await run(mw, { user: { role: ROLES.CUSTOMER } })).status, 403);
  assert.equal((await run(mw, {})).status, 401);
});

test('requireServiceKey: chỉ chấp nhận đúng khóa', async () => {
  const mw = requireServiceKey('abc123');
  assert.equal(await run(mw, { headers: { 'x-service-key': 'abc123' } }), undefined);
  assert.equal((await run(mw, { headers: { 'x-service-key': 'sai' } })).status, 401);
  assert.equal((await run(mw, { headers: {} })).status, 401);
  // chưa cấu hình khóa => luôn từ chối
  assert.equal(
    (await run(requireServiceKey(''), { headers: { 'x-service-key': '' } })).status,
    401,
  );
});
