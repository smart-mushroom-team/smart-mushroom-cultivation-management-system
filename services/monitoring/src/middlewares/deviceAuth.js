'use strict';

const crypto = require('crypto');
const { AppError, ERROR_CODES } = require('@mushroom/shared');
const deviceRepository = require('../repositories/device.repository');

/**
 * BR-10 — xác thực thiết bị bằng header X-Device-Key.
 */
async function deviceAuth(req, res, next) {
  try {
    const { deviceId } = req.params;
    const apiKey = req.headers['x-device-key'];

    // 1. Kiểm tra header
    if (!apiKey) {
      return next(new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Thiếu X-Device-Key header'));
    }

    // 2. Lấy device từ database
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      return next(new AppError(404, ERROR_CODES.NOT_FOUND, `Device ${deviceId} không tồn tại`));
    }

    // 3. Băm API key và so sánh
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    if (apiKeyHash !== device.apiKeyHash) {
      return next(new AppError(401, ERROR_CODES.UNAUTHORIZED, 'X-Device-Key không hợp lệ'));
    }

    // 4. Kiểm tra device status
    if (device.status === 'INACTIVE') {
      return next(new AppError(403, ERROR_CODES.FORBIDDEN, 'Device đã bị vô hiệu hóa'));
    }

    // 5. Gắn device vào request
    req.device = device;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { deviceAuth };
