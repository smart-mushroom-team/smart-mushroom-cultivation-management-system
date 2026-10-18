'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { z } = require('zod');
const {
  requestId,
  errorHandler,
  notFoundHandler,
  validate,
  conflict,
  createLogger,
} = require('../src');

async function startApp() {
  const logger = createLogger('test');
  logger.level = 'silent';
  const app = express();
  app.use(requestId());
  app.use(express.json());
  app.get('/conflict', () => {
    throw conflict('Hết khay', 'INSUFFICIENT_TRAYS');
  });
  app.get('/boom', () => {
    throw new Error('lỗi bất ngờ có thông tin nhạy cảm');
  });
  app.post('/rooms', validate({ body: z.object({ name: z.string().min(1) }) }), (req, res) =>
    res.status(201).json(req.validated.body),
  );
  const dbError = (code, meta) => () => {
    throw Object.assign(new Error('db'), { code, meta });
  };
  app.get('/db-unique', dbError('P2010', { code: '23505' }));
  app.get('/db-check', dbError('P2010', { code: '23514' }));
  app.get('/db-p2004', dbError('P2004'));
  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

test('errorHandler trả format lỗi chuẩn', async (t) => {
  const { server, base } = await startApp();
  t.after(() => server.close());

  let res = await fetch(`${base}/conflict`);
  let json = await res.json();
  assert.equal(res.status, 409);
  assert.equal(json.error.code, 'INSUFFICIENT_TRAYS');
  assert.ok(json.error.requestId);

  res = await fetch(`${base}/boom`);
  json = await res.json();
  assert.equal(res.status, 500);
  assert.equal(json.error.code, 'INTERNAL_ERROR');
  assert.ok(!JSON.stringify(json).includes('nhạy cảm'), 'không được lộ chi tiết lỗi nội bộ');

  res = await fetch(`${base}/khong-co`);
  assert.equal(res.status, 404);

  res = await fetch(`${base}/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"name": ""}',
  });
  json = await res.json();
  assert.equal(res.status, 422);
  assert.equal(json.error.code, 'VALIDATION_ERROR');

  res = await fetch(`${base}/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{hỏng',
  });
  assert.equal(res.status, 400);
});

test('errorHandler: lỗi ràng buộc DB trả 409, không phải 500', async (t) => {
  const { server, base } = await startApp();
  t.after(() => server.close());

  let res = await fetch(`${base}/db-unique`);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, 'CONFLICT');

  res = await fetch(`${base}/db-check`);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, 'INVALID_STATE');

  res = await fetch(`${base}/db-p2004`);
  assert.equal(res.status, 409);
});
