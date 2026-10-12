'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createLogger, signAccessToken, ROLES } = require('@mushroom/shared');
const { createApp } = require('../src/app');

const SECRET = 'test-secret';

function listen(server) {
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve(server.address().port)),
  );
}

/** Service giả: ghi lại request nhận được. */
function stubService(name) {
  const received = [];
  const server = http.createServer((req, res) => {
    received.push({ method: req.method, url: req.url, headers: req.headers });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ from: name, url: req.url }));
  });
  return { server, received };
}

async function setup(t, { downstreamUp = true } = {}) {
  const identity = stubService('identity');
  const core = stubService('core');
  const monitoring = stubService('monitoring');
  const ports = { identity: 1, core: 1, monitoring: 1 }; // cổng 1: không ai nghe => ECONNREFUSED
  if (downstreamUp) {
    ports.identity = await listen(identity.server);
    ports.core = await listen(core.server);
    ports.monitoring = await listen(monitoring.server);
  }
  const logger = createLogger('gateway-test');
  logger.level = 'silent';
  const config = {
    jwtSecret: SECRET,
    corsOrigins: ['http://localhost:5173'],
    timeoutMs: 5000,
    maxBodyBytes: 1024,
    rateLimitPerMinute: 1000,
    trustProxy: false,
    targets: {
      identity: `http://127.0.0.1:${ports.identity}`,
      core: `http://127.0.0.1:${ports.core}`,
      monitoring: `http://127.0.0.1:${ports.monitoring}`,
    },
  };
  const gw = createApp({ config, logger }).listen(0, '127.0.0.1');
  await new Promise((resolve) => gw.once('listening', resolve));
  t.after(() => {
    for (const s of [gw, identity.server, core.server, monitoring.server]) {
      if (s.listening) s.close();
    }
  });
  return { base: `http://127.0.0.1:${gw.address().port}`, identity, core, monitoring };
}

const token = (role = ROLES.CUSTOMER) =>
  signAccessToken({ id: 'user-1', role, name: 'Test' }, { secret: SECRET });

test('GET /health không cần JWT', async (t) => {
  const { base } = await setup(t);
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).service, 'gateway');
});

test('route người dùng của Core/Monitoring yêu cầu JWT, trả 401 sớm', async (t) => {
  const { base, core, monitoring } = await setup(t);
  for (const path of ['/api/core/rooms', '/api/monitoring/devices']) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 401, path);
  }
  assert.equal(core.received.length + monitoring.received.length, 0, 'không được chuyển tiếp');
});

test('bỏ tiền tố /api/<service>, giữ query và chuyển tiếp Authorization', async (t) => {
  const { base, core } = await setup(t);
  const res = await fetch(`${base}/api/core/rooms?status=ACTIVE`, {
    headers: { authorization: `Bearer ${token()}` },
  });
  assert.equal(res.status, 200);
  assert.equal(core.received[0].url, '/rooms?status=ACTIVE');
  assert.ok(core.received[0].headers.authorization.startsWith('Bearer '));
  assert.ok(core.received[0].headers['x-request-id'], 'phải gắn X-Request-Id');
});

test('Identity: đăng nhập/đăng ký không cần JWT, route khác thì cần', async (t) => {
  const { base, identity } = await setup(t);
  let res = await fetch(`${base}/api/identity/auth/login`, { method: 'POST' });
  assert.equal(res.status, 200);
  assert.equal(identity.received[0].url, '/auth/login');

  res = await fetch(`${base}/api/identity/auth/login/`, { method: 'POST' });
  assert.equal(res.status, 200, 'dấu / cuối vẫn là route công khai');

  res = await fetch(`${base}/api/identity/users`);
  assert.equal(res.status, 401);

  res = await fetch(`${base}/api/identity/me`);
  assert.equal(res.status, 401);

  res = await fetch(`${base}/api/identity/auth/login`); // sai method
  assert.equal(res.status, 401);
});

test('/iot/** không cần JWT và giữ nguyên đường dẫn', async (t) => {
  const { base, monitoring } = await setup(t);
  const res = await fetch(`${base}/iot/devices/abc/telemetry`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-device-key': 'k' },
    body: '{"temperature":28.5,"humidity":80}',
  });
  assert.equal(res.status, 200);
  assert.equal(monitoring.received[0].url, '/iot/devices/abc/telemetry');
  assert.equal(monitoring.received[0].headers['x-device-key'], 'k');
});

test('/internal không bao giờ được định tuyến ra ngoài (kể cả dạng lách)', async (t) => {
  const { base, core, monitoring, identity } = await setup(t);
  const auth = { authorization: `Bearer ${token(ROLES.ADMIN)}` };
  const paths = [
    '/internal/alerts',
    '/api/core/internal/alerts',
    '/api/core/Internal/alerts',
    '/api/core/%69nternal/alerts',
    '/api/core//internal/alerts',
    '/api/monitoring/internal/x',
    '/api/identity/internal/x',
    '/iot/internal/x',
  ];
  for (const p of paths) {
    const res = await fetch(`${base}${p}`, { headers: auth });
    assert.equal(res.status, 404, p);
  }
  const res = await fetch(`${base}/api/core/a/../internal/alerts`, { headers: auth });
  assert.ok([400, 404].includes(res.status));
  assert.equal(core.received.length + monitoring.received.length + identity.received.length, 0);
});

test('body vượt giới hạn bị từ chối 413', async (t) => {
  const { base, monitoring } = await setup(t);
  const res = await fetch(`${base}/iot/devices/abc/snapshot`, {
    method: 'POST',
    headers: { 'x-device-key': 'k', 'content-type': 'application/octet-stream' },
    body: Buffer.alloc(2048),
  });
  assert.equal(res.status, 413);
  assert.equal((await res.json()).error.code, 'PAYLOAD_TOO_LARGE');
  assert.equal(monitoring.received.length, 0);
});

test('service phía sau không chạy: trả 503 theo format chuẩn', async (t) => {
  const { base } = await setup(t, { downstreamUp: false });
  const res = await fetch(`${base}/api/core/rooms`, {
    headers: { authorization: `Bearer ${token()}` },
  });
  assert.equal(res.status, 503);
  const json = await res.json();
  assert.equal(json.error.code, 'SERVICE_UNAVAILABLE');
  assert.ok(json.error.requestId);
});

test('service phía sau trả lời quá chậm: trả 504 theo format chuẩn', async (t) => {
  const slow = http.createServer(() => {
    /* không bao giờ trả lời */
  });
  const slowPort = await listen(slow);
  const logger = createLogger('gateway-test');
  logger.level = 'silent';
  const config = {
    jwtSecret: SECRET,
    corsOrigins: [],
    timeoutMs: 300, // rất ngắn để test nhanh
    maxBodyBytes: 1024,
    rateLimitPerMinute: 1000,
    trustProxy: false,
    targets: {
      identity: `http://127.0.0.1:${slowPort}`,
      core: `http://127.0.0.1:${slowPort}`,
      monitoring: `http://127.0.0.1:${slowPort}`,
    },
  };
  const gw = createApp({ config, logger }).listen(0, '127.0.0.1');
  await new Promise((resolve) => gw.once('listening', resolve));
  t.after(() => {
    gw.closeAllConnections();
    gw.close();
    slow.closeAllConnections();
    slow.close();
  });

  const started = Date.now();
  const res = await fetch(`http://127.0.0.1:${gw.address().port}/api/core/rooms`, {
    headers: { authorization: `Bearer ${token()}` },
  });
  assert.equal(res.status, 504);
  assert.equal((await res.json()).error.code, 'GATEWAY_TIMEOUT');
  assert.ok(Date.now() - started < 3000, 'phải trả lời nhanh sau timeout chứ không treo');
});

test('nhiều request liên tiếp trên một kết nối keep-alive không gây rò rỉ listener', async (t) => {
  const { base } = await setup(t);
  const warnings = [];
  const onWarning = (w) => warnings.push(w.name);
  process.on('warning', onWarning);
  t.after(() => process.off('warning', onWarning));

  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  t.after(() => agent.destroy());
  const get = () =>
    new Promise((resolve, reject) => {
      http
        .get(`${base}/health`, { agent }, (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode));
        })
        .on('error', reject);
    });
  const auth = token();
  const getProxied = () =>
    new Promise((resolve, reject) => {
      http
        .get(
          `${base}/api/core/rooms`,
          { agent, headers: { authorization: `Bearer ${auth}` } },
          (res) => {
            res.resume();
            res.on('end', () => resolve(res.statusCode));
          },
        )
        .on('error', reject);
    });
  for (let i = 0; i < 15; i += 1) {
    assert.equal(await get(), 200);
    assert.equal(await getProxied(), 200);
  }
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(!warnings.includes('MaxListenersExceededWarning'), `cảnh báo: ${warnings.join(',')}`);
});
