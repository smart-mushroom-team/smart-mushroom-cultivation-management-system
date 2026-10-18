'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createLogger, ROLES } = require('@mushroom/shared');
const { createRoomAccess } = require('../src/middlewares/roomAccess');

const logger = createLogger('test');
logger.level = 'silent';

/** Core giả: handler(req, res) tự quyết định trả gì. */
async function fakeCore(t, handler) {
  const calls = [];
  const server = http.createServer((req, res) => {
    calls.push({ url: req.url, headers: req.headers });
    handler(req, res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  return { url: `http://127.0.0.1:${server.address().port}`, calls };
}

function run(mw, req) {
  return new Promise((resolve) => mw(req, {}, (err) => resolve(err)));
}

const customerReq = (roomId = 'room-1') => ({
  id: 'req-1',
  user: { id: 'cus-1', role: ROLES.CUSTOMER },
  params: { roomId },
});

const options = (coreUrl, extra = {}) => ({
  coreUrl,
  serviceKey: 'svc-key',
  timeoutMs: 500,
  logger,
  ...extra,
});

test('Operator/Admin xem mọi phòng và KHÔNG gọi Core (BR-08)', async (t) => {
  const core = await fakeCore(t, (_req, res) => res.end('{}'));
  const mw = createRoomAccess(options(core.url));
  for (const role of [ROLES.OPERATOR, ROLES.ADMIN]) {
    const err = await run(mw, { id: 'r', user: { id: 'u', role }, params: { roomId: 'x' } });
    assert.equal(err, undefined);
  }
  assert.equal(core.calls.length, 0);
});

test('Customer được phép khi Core trả allowed=true; gửi X-Service-Key và customerId', async (t) => {
  const core = await fakeCore(t, (_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ allowed: true, rentalId: 'r1' }));
  });
  const req = customerReq('room-9');
  const err = await run(createRoomAccess(options(core.url)), req);
  assert.equal(err, undefined);
  assert.equal(req.roomAccess.rentalId, 'r1');
  assert.equal(core.calls[0].url, '/internal/rooms/room-9/access?customerId=cus-1');
  assert.equal(core.calls[0].headers['x-service-key'], 'svc-key');
});

test('Customer bị từ chối khi Core trả allowed=false (403 kèm lý do)', async (t) => {
  const core = await fakeCore(t, (_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ allowed: false, reason: 'Đơn thuê đã hết hạn' }));
  });
  const err = await run(createRoomAccess(options(core.url)), customerReq());
  assert.equal(err.status, 403);
  assert.match(err.message, /hết hạn/);
});

test('Fail-closed: Core trả 500 => 503 ACCESS_CHECK_UNAVAILABLE', async (t) => {
  const core = await fakeCore(t, (_req, res) => {
    res.statusCode = 500;
    res.end('{}');
  });
  const err = await run(createRoomAccess(options(core.url)), customerReq());
  assert.equal(err.status, 503);
  assert.equal(err.code, 'ACCESS_CHECK_UNAVAILABLE');
});

test('Fail-closed: Core không chạy => 503', async () => {
  const err = await run(createRoomAccess(options('http://127.0.0.1:1')), customerReq());
  assert.equal(err.status, 503);
});

test('Fail-closed: Core quá thời gian => 503', async (t) => {
  const core = await fakeCore(t, () => {
    /* không bao giờ trả lời */
  });
  const err = await run(createRoomAccess(options(core.url, { timeoutMs: 100 })), customerReq());
  assert.equal(err.status, 503);
});

test('Fail-closed: Core trả JSON không có allowed=true => từ chối', async (t) => {
  const core = await fakeCore(t, (_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ allowed: 'true' })); // sai kiểu
  });
  const err = await run(createRoomAccess(options(core.url)), customerReq());
  assert.equal(err.status, 403);
});
