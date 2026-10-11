'use strict';

const { notImplemented } = require('@mushroom/shared');

// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // GET / — lọc roomId, type, status, connectionState
  list: notImplemented('device.list'),
  // GET /summary — FR-44: số thiết bị theo connectionState
  summary: notImplemented('device.summary'),
  // POST / — FR-27: sinh API key, trả plaintext một lần, chỉ lưu hash
  create: notImplemented('device.create'),
  // GET /:id — trạng thái, lastSeen
  getById: notImplemented('device.getById'),
  // PATCH /:id — FR-40: đổi tên, chu kỳ gửi (KHÔNG đổi roomId, BR-09)
  update: notImplemented('device.update'),
  // POST /:id/activate — FR-28: kích hoạt lại (bắt đầu ở OFFLINE)
  activate: notImplemented('device.activate'),
  // POST /:id/deactivate — FR-28: đặt INACTIVE + OFFLINE, không cảnh báo
  deactivate: notImplemented('device.deactivate'),
  // POST /:id/rotate-key — FR-29 (mức S): cấp lại API key, khóa cũ mất hiệu lực ngay
  rotateKey: notImplemented('device.rotateKey'),
};
