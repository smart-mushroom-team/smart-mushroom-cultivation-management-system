'use strict';

const { notImplemented } = require('@mushroom/shared');

// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // POST / — FR-43: lưu FCM token của thiết bị người dùng
  register: notImplemented('deviceToken.register'),
  // DELETE / — FR-43: xóa FCM token (query ?token=...), gọi khi đăng xuất
  unregister: notImplemented('deviceToken.unregister'),
};
