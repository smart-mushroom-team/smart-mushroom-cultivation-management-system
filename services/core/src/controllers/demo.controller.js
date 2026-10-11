'use strict';

const { notImplemented } = require('@mushroom/shared');

// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // GET /state — FR-26: demoMode + ngày giả lập hiện tại
  getState: notImplemented('demo.getState'),
  // PUT /date — FR-26: đặt/xóa ngày giả lập (403 DEMO_MODE_DISABLED nếu tắt demo)
  setDate: notImplemented('demo.setDate'),
  // POST /run-expiry-job — FR-26: chạy Rental Expiry Job thủ công
  runExpiryJob: notImplemented('demo.runExpiryJob'),
};
