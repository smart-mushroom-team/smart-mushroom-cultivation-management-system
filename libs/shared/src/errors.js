'use strict';

const { ERROR_CODES } = require('./constants');

/**
 * Lỗi nghiệp vụ có kiểm soát. Ném ra từ bất kỳ tầng nào (controller/service/repository);
 * errorHandler sẽ chuyển thành response chuẩn:
 *   { "error": { "code": "...", "message": "...", "details": ..., "requestId": "..." } }
 */
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message = 'Yêu cầu không hợp lệ', details) =>
  new AppError(400, ERROR_CODES.BAD_REQUEST, message, details);

const validationError = (message = 'Dữ liệu không hợp lệ', details) =>
  new AppError(422, ERROR_CODES.VALIDATION_ERROR, message, details);

const unauthorized = (message = 'Chưa đăng nhập hoặc token không hợp lệ', code) =>
  new AppError(401, code || ERROR_CODES.UNAUTHORIZED, message);

const forbidden = (message = 'Không có quyền thực hiện thao tác này', code) =>
  new AppError(403, code || ERROR_CODES.FORBIDDEN, message);

const notFound = (message = 'Không tìm thấy tài nguyên') =>
  new AppError(404, ERROR_CODES.NOT_FOUND, message);

/** 409: xung đột dữ liệu / sai trạng thái. Truyền code cụ thể (INVALID_STATE, INSUFFICIENT_TRAYS...). */
const conflict = (message = 'Xung đột dữ liệu', code = ERROR_CODES.CONFLICT, details) =>
  new AppError(409, code, message, details);

const unavailable = (message = 'Dịch vụ tạm thời không khả dụng', code) =>
  new AppError(503, code || ERROR_CODES.SERVICE_UNAVAILABLE, message);

/** Dùng cho controller chưa viết: `notImplemented('rentals.create')`. */
const notImplemented = (name) => (_req, _res, next) =>
  next(new AppError(501, ERROR_CODES.NOT_IMPLEMENTED, `Chưa cài đặt: ${name}`));

module.exports = {
  AppError,
  badRequest,
  validationError,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unavailable,
  notImplemented,
};
