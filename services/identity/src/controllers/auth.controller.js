'use strict';

const { notImplemented } = require('@mushroom/shared');

// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // POST /register — FR-03: khách tự đăng ký (role CUSTOMER)
  register: notImplemented('auth.register'),
  // POST /login — FR-02: email + mật khẩu, trả JWT + refresh token; khóa 5 phút nếu sai 5 lần
  login: notImplemented('auth.login'),
  // POST /refresh — cấp access token mới từ refresh token
  refresh: notImplemented('auth.refresh'),
  // POST /logout — thu hồi refresh token
  logout: notImplemented('auth.logout'),
};
