'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createLogger, signAccessToken, ROLES } = require('@mushroom/shared');
const { createApp } = require('../src/app');

const SECRET = 'test-secret';
const SERVICE_KEY = 'svc-key';
const logger = createLogger('test');
logger.level = 'silent';

const config = {
  jwtSecret: SECRET,
  serviceKey: SERVICE_KEY,
  coreUrl: 'http://127.0.0.1:1', // Core không chạy => fail-closed
  roomAccessTimeoutMs: 300,
  maxSnapshotBytes: 2 * 1024 * 1024,
};

const tokenFor = (role) => signAccessToken({ id: 'u1', role, name: 'T' }, { secret: SECRET });

async function call(base, { method = 'GET', path, role, headers = {}, body }) {
  const h = { ...headers };
  if (role) h.authorization = `Bearer ${tokenFor(role)}`;
  if (body && !h['content-type']) h['content-type'] = 'application/json';
  const res = await fetch(`${base}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.status;
}

/**
 * Bảng phân quyền: [method, path, role, status mong đợi].
 * 501 = đã qua guard, controller còn là stub. 401/403 = bị guard chặn.
 */
const CASES = [
  ['GET', '/devices', undefined, 401],
  ['GET', '/devices', ROLES.CUSTOMER, 403],
  ['GET', '/devices', ROLES.OPERATOR, 200],
  ['POST', '/devices', ROLES.ADMIN, 500],
  ['PUT', '/rooms/r1/threshold', ROLES.CUSTOMER, 403],
  ['PUT', '/rooms/r1/threshold', ROLES.OPERATOR, 501],
  ['GET', '/rooms/r1/camera/snapshot', undefined, 401],
  ['GET', '/rooms/r1/camera/snapshot', ROLES.OPERATOR, 501],
  ['GET', '/rooms/r1/sensor/latest', ROLES.CUSTOMER, 503],
  ['POST', '/iot/devices/d1/telemetry', undefined, 401],
  ['POST', '/iot/devices/d1/snapshot', undefined, 401],
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
  for (const [method, path, role, expected, headers, body] of CASES) {
    const status = await call(base, { method, path, role, headers, body });
    assert.equal(status, expected, `${method} ${path} role=${role || 'none'}`);
  }
});
