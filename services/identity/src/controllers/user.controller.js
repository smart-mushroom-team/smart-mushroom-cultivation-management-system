'use strict';

const { notImplemented } = require('@mushroom/shared');

// Toàn bộ /users chỉ dành cho ADMIN (guard đặt ở routes/index.js).
// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // GET / — FR-04: danh sách, lọc role/status, tìm kiếm, phân trang
  list: notImplemented('user.list'),
  // POST / — FR-04: Admin tạo tài khoản (kể cả Operator, Admin)
  create: notImplemented('user.create'),
  // GET /:id — FR-04
  getById: notImplemented('user.getById'),
  // PATCH /:id — FR-04: sửa thông tin, gán vai trò
  update: notImplemented('user.update'),
  // POST /:id/deactivate — FR-04, BR-15: vô hiệu hóa, không xóa
  deactivate: notImplemented('user.deactivate'),
  // POST /:id/activate — FR-04: kích hoạt lại
  activate: notImplemented('user.activate'),
  // POST /:id/reset-password — FR-04: Admin đặt lại mật khẩu
  resetPassword: notImplemented('user.resetPassword'),
};
