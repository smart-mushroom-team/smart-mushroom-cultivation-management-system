'use strict';

const { Router } = require('express');
const controller = require('../controllers/iot.controller');
const { deviceAuth } = require('../middlewares/deviceAuth');

/**
 * Giao diện thiết bị (SRS 7.2). Mount ở /iot, Gateway giữ nguyên đường dẫn, không kiểm JWT.
 * Thứ tự middleware: xác thực thiết bị TRƯỚC, rồi mới nhận body/ảnh.
 * `upload` được truyền từ routes/index.js để cấu hình giới hạn kích thước từ config.
 */
function createIotRoutes({ upload }) {
  const router = Router();
  router.post('/devices/:deviceId/snapshot', deviceAuth, upload, controller.snapshot);
  router.post('/devices/:deviceId/telemetry', deviceAuth, controller.telemetry);
  router.get('/devices/:deviceId/commands', deviceAuth, controller.commands);
  return router;
}

module.exports = { createIotRoutes };
