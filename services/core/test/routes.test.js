'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createLogger, signAccessToken, ROLES } = require('@mushroom/shared');
const { createApp } = require('../src/app');

const SECRET = 'test-secret';
const SERVICE_KEY = 'svc-key';
const logger = createLogger('test');
logger.level = 'silent';

const config = { jwtSecret: SECRET, serviceKey: SERVICE_KEY, demoMode: true };

const tokenFor = (role) => signAccessToken({ id: 'u1', role, name: 'T' }, { secret: SECRET });

async function call(base, { method = 'GET', path, role, headers = {} }) {
  const h = { ...headers };
  if (role) h.authorization = `Bearer ${tokenFor(role)}`;
  const res = await fetch(`${base}${path}`, { method, headers: h });
  return res.status;
}

/**
 * Bảng phân quyền: [method, path, role, status mong đợi].
 * 501 = đã qua guard, controller còn là stub. 401/403 = bị guard chặn.
 */
const CASES = [
  ['GET', '/rooms', undefined, 401],
  ['GET', '/rooms', ROLES.CUSTOMER, 403],
  ['GET', '/rooms', ROLES.OPERATOR, 200],
  ['GET', '/rooms', ROLES.ADMIN, 200], // Admin kế thừa quyền Operator
  ['POST', '/packages', ROLES.OPERATOR, 403], // chỉ Admin quản lý gói
  ['POST', '/packages', ROLES.ADMIN, 501],
  ['GET', '/packages', ROLES.CUSTOMER, 501],
  ['POST', '/rentals', ROLES.CUSTOMER, 501],
  ['POST', '/rentals', ROLES.OPERATOR, 403], // chỉ Customer đặt đơn
  ['POST', '/rentals/abc/confirm', ROLES.CUSTOMER, 403],
  ['POST', '/rentals/abc/confirm', ROLES.OPERATOR, 501],
  ['GET', '/my-trays', ROLES.CUSTOMER, 501],
  ['GET', '/my-trays', ROLES.OPERATOR, 403],
  ['POST', '/cycles/abc/harvest', ROLES.CUSTOMER, 403],
  ['POST', '/cycles/abc/harvest', ROLES.OPERATOR, 501],
  ['GET', '/notifications', ROLES.CUSTOMER, 501],
  ['POST', '/demo/run-expiry-job', ROLES.OPERATOR, 403],
  ['POST', '/demo/run-expiry-job', ROLES.ADMIN, 501],
  ['GET', '/internal/rooms/r1/access', ROLES.ADMIN, 401], // JWT không thay được khóa dịch vụ
  ['GET', '/internal/rooms/r1/access', undefined, 401],
  ['GET', '/internal/rooms/r1/access', undefined, 501, { 'x-service-key': SERVICE_KEY }],
];

test('/health công khai', async (t) => {
  const server = createApp({ config, logger }).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  t.after(() => server.close());
  const res = await fetch(`http://127.0.0.1:${server.address().port}/health`);
  assert.equal(res.status, 200);
});

test('bảng phân quyền theo vai trò', async (t) => {
  const server = createApp({ config, logger }).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [method, path, role, expected, headers] of CASES) {
    const status = await call(base, { method, path, role, headers });
    assert.equal(status, expected, `${method} ${path} role=${role || 'none'}`);
  }
});
