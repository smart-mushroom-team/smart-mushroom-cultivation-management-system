'use strict';

const { notImplemented } = require('@mushroom/shared');

// Mount ở /iot. Luôn dùng deviceAuth TRƯỚC khi parse body (xem iot.routes.js).
// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // POST /devices/:deviceId/snapshot — FR-30/31, UC-10: nhận ảnh JPEG <= 2MB, ghi đè latest snapshot
  snapshot: notImplemented('iot.snapshot'),
  // POST /devices/:deviceId/telemetry — FR-32/33, UC-11: kiểm khoảng giá trị, lưu SensorReading, đánh giá ngưỡng
  telemetry: notImplemented('iot.telemetry'),
  // GET /devices/:deviceId/commands — FR-41 (mức C)
  commands: notImplemented('iot.commands'),
};
