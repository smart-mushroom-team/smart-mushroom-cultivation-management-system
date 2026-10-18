'use strict';

const { AppError, ERROR_CODES, unauthorized, forbidden } = require('@mushroom/shared');

/** Lỗi nghiệp vụ riêng của Identity. Thông báo cố ý chung chung để không lộ thông tin tài khoản. */

// Dùng cho CẢ "email không tồn tại" lẫn "sai mật khẩu": không cho dò xem email nào đã đăng ký.
const invalidCredentials = () => unauthorized('Email hoặc mật khẩu không đúng');

const invalidRefreshToken = () => unauthorized('Refresh token không hợp lệ hoặc đã hết hạn');

const accountDisabled = () =>
  forbidden('Tài khoản đã bị vô hiệu hóa', ERROR_CODES.ACCOUNT_DISABLED);

const accountLocked = (lockedUntil, now) => {
  const retryAfterSeconds = Math.max(1, Math.ceil((lockedUntil - now) / 1000));
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return new AppError(
    423,
    ERROR_CODES.ACCOUNT_LOCKED,
    `Tài khoản tạm khóa do nhập sai mật khẩu nhiều lần. Thử lại sau khoảng ${minutes} phút`,
    { retryAfterSeconds },
  );
};

module.exports = { invalidCredentials, invalidRefreshToken, accountDisabled, accountLocked };
