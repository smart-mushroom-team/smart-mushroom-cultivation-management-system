'use strict';

const { notImplemented } = require('@mushroom/shared');

// Mọi route ở đây đi qua middleware roomAccess (BR-08, fail-closed). Mount ở routes/index.js.
// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // GET /camera — FR-34/39: metadata camera (trạng thái, capturedAt)
  getCamera: notImplemented('roomView.getCamera'),
  // GET /camera/snapshot — FR-34: trả image/jpeg + header X-Captured-At
  getSnapshot: notImplemented('roomView.getSnapshot'),
  // GET /sensor/latest — FR-34: số liệu mới nhất + trạng thái cảm biến
  getLatestReading: notImplemented('roomView.getLatestReading'),
  // GET /sensor/readings — FR-35: chuỗi số liệu 1h/24h, rút gọn <= ~300 điểm
  getReadings: notImplemented('roomView.getReadings'),
};
