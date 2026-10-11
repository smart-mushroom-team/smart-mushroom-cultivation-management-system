'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createLogger, signAccessToken, ROLES } = require('@mushroom/shared');
const { createApp } = require('../src/app');

const SECRET = 'test-secret';
const logger = createLogger('test');
logger.level = 'silent';

const config = { jwtSecret: SECRET, jwtExpiresIn: '1h' };

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
  ['POST', '/auth/login', undefined, 501], // công khai
  ['POST', '/auth/register', undefined, 501],
  ['GET', '/me', undefined, 401],
  ['GET', '/me', ROLES.CUSTOMER, 501],
  ['GET', '/users', undefined, 401],
  ['GET', '/users', ROLES.CUSTOMER, 403],
  ['GET', '/users', ROLES.OPERATOR, 403], // /users chỉ Admin
  ['GET', '/users', ROLES.ADMIN, 501],
  ['POST', '/users/abc/deactivate', ROLES.ADMIN, 501],
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
