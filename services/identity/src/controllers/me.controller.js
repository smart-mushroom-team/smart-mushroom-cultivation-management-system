'use strict';

const { notImplemented } = require('@mushroom/shared');

// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // GET / — FR-05: xem hồ sơ của chính mình
  getProfile: notImplemented('me.getProfile'),
  // PATCH / — FR-05: sửa họ tên, số điện thoại, địa chỉ
  updateProfile: notImplemented('me.updateProfile'),
};
