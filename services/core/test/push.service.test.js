'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sendToTokens, stringifyData } = require('../src/services/push.service');

test('stringifyData: FCM yêu cầu mọi giá trị data là chuỗi', () => {
  assert.deepEqual(stringifyData({ rentalId: 12, ok: true }), { rentalId: '12', ok: 'true' });
});

test('sendToTokens: danh sách rỗng thì không làm gì', async () => {
  const res = await sendToTokens([], { title: 'a', body: 'b' });
  assert.deepEqual(res, { sent: 0, failed: 0, invalidTokens: [] });
});

test('sendToTokens: chưa cấu hình Firebase thì bỏ qua, KHÔNG ném lỗi', async () => {
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const res = await sendToTokens(['tok1'], { title: 'Đơn đã xác nhận', body: '...' });
  assert.equal(res.skipped, 'FCM_NOT_CONFIGURED');
  assert.equal(res.sent, 0);
});
