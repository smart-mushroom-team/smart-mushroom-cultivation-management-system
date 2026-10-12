'use strict';

const { z } = require('@mushroom/shared');
const c = require('./common.validator');

// strictObject: trường lạ bị từ chối (422). Ví dụ gửi { role: 'ADMIN' } khi đăng ký sẽ bị chặn,
// khách không thể tự cấp quyền cho mình.
const registerBody = z.strictObject({
  name: c.name,
  email: c.email,
  password: c.password,
  phone: c.phone.nullable().optional(),
  address: c.address.nullable().optional(),
});

// Đăng nhập không áp quy tắc độ dài tối thiểu (tránh lộ chính sách); chỉ chặn đầu vào quá lớn.
const loginBody = z.strictObject({
  email: c.email,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu').max(200),
});

const refreshBody = z.strictObject({
  refreshToken: z.string().min(1, 'Thiếu refresh token').max(512),
});

module.exports = { registerBody, loginBody, refreshBody };
