'use strict';

const { notImplemented } = require('@mushroom/shared');

// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // GET / — FR-11: Customer chỉ thấy gói đang bật, kèm số khay AVAILABLE; staff thấy tất cả
  list: notImplemented('package.list'),
  // POST / — FR-10
  create: notImplemented('package.create'),
  // GET /:id — FR-10
  getById: notImplemented('package.getById'),
  // PATCH /:id — FR-10: tên, số ngày, giá/khay, bật/tắt
  update: notImplemented('package.update'),
};
