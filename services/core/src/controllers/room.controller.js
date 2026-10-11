'use strict';

const { notImplemented } = require('@mushroom/shared');

// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // GET / — FR-07: lọc theo status
  list: notImplemented('room.list'),
  // POST / — FR-07
  create: notImplemented('room.create'),
  // GET /:id — FR-07
  getById: notImplemented('room.getById'),
  // PATCH /:id — FR-07: sửa tên, ACTIVE/INACTIVE (không INACTIVE nếu còn khay RESERVED/RENTED)
  update: notImplemented('room.update'),
};
