'use strict';

const { notImplemented } = require('@mushroom/shared');

// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // POST / — FR-12, UC-02, BR-01: 1 giao dịch DB (SELECT ... FOR UPDATE SKIP LOCKED), tạo đơn PAID
  create: notImplemented('rental.create'),
  // GET / — Customer: đơn của mình; staff: tất cả. Lọc status, sort (đơn PAID cũ nhất lên trước)
  list: notImplemented('rental.list'),
  // GET /:id — FR-15: Customer chỉ xem đơn của mình (BR-02)
  getById: notImplemented('rental.getById'),
  // POST /:id/confirm — FR-13, UC-03: PAID -> ACTIVE, khay RENTED, tạo đợt nuôi đầu tiên (1 giao dịch)
  confirm: notImplemented('rental.confirm'),
  // POST /:id/reject — FR-14: lý do bắt buộc, khay về AVAILABLE, hoàn tiền mô phỏng
  reject: notImplemented('rental.reject'),
};
