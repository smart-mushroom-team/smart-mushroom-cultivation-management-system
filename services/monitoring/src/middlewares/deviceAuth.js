'use strict';

const { AppError, ERROR_CODES } = require('@mushroom/shared');

/**
 * BR-10 — xác thực thiết bị bằng header X-Device-Key. Đặt TRƯỚC khi parse body (multer).
 *
 * TODO (Monitoring dev):
 *   1. Lấy Device theo req.params.deviceId (không có => 404).
 *   2. Băm khóa nhận được (SHA-256) rồi so với device.apiKeyHash bằng crypto.timingSafeEqual
 *      (sai => 401).
 *   3. device.status === 'INACTIVE' => 403.
 *   4. Đúng thì gắn req.device = device rồi next().
 *
 * Hiện tại middleware này TỪ CHỐI mọi request (fail-closed) để không vô tình mở cổng cho thiết bị giả.
 */
function deviceAuth(_req, _res, next) {
  next(
    new AppError(501, ERROR_CODES.NOT_IMPLEMENTED, 'Chưa cài đặt xác thực thiết bị (deviceAuth)'),
  );
}

module.exports = { deviceAuth };
