'use strict';

const { AppError } = require('../errors');
const { ERROR_CODES } = require('../constants');
const { sqlState } = require('../db');

function body(code, message, req, details) {
  const error = { code, message, requestId: req.id };
  if (details !== undefined) error.details = details;
  return { error };
}

/** 404 cho route không tồn tại. Đặt sau tất cả route. */
function notFoundHandler(req, res) {
  res
    .status(404)
    .json(body(ERROR_CODES.NOT_FOUND, `Không tìm thấy ${req.method} ${req.path}`, req));
}

/**
 * Middleware lỗi cuối cùng: chuyển mọi lỗi thành format chuẩn, không để lộ stack trace.
 * Đặt sau notFoundHandler.
 */
function errorHandler(logger) {
  return (err, req, res, _next) => {
    if (res.headersSent) return;

    if (err instanceof AppError) {
      return res.status(err.status).json(body(err.code, err.message, req, err.details));
    }

    // Lỗi từ body-parser của Express
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json(body(ERROR_CODES.BAD_REQUEST, 'Body JSON không hợp lệ', req));
    }
    if (err.type === 'entity.too.large') {
      return res
        .status(413)
        .json(body(ERROR_CODES.PAYLOAD_TOO_LARGE, 'Dữ liệu gửi lên quá lớn', req));
    }

    // Lỗi từ thư viện zod
    if (err.name === 'ZodError') {
      const details = (err.issues || []).map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return res
        .status(422)
        .json(body(ERROR_CODES.VALIDATION_ERROR, 'Dữ liệu không hợp lệ', req, details));
    }

    // Lỗi từ multer (upload ảnh)
    if (err.name === 'MulterError') {
      const tooLarge = err.code === 'LIMIT_FILE_SIZE';
      return res
        .status(tooLarge ? 413 : 400)
        .json(
          body(
            tooLarge ? ERROR_CODES.PAYLOAD_TOO_LARGE : ERROR_CODES.BAD_REQUEST,
            tooLarge ? 'Ảnh vượt quá dung lượng cho phép' : err.message,
            req,
          ),
        );
    }

    // Ràng buộc DB là tuyến phòng thủ cuối (xem docs/DATABASE.md). Service nên kiểm tra trước để trả lỗi
    // cụ thể; nếu vẫn lọt xuống DB thì trả 409 thay vì 500. Raw SQL => P2010 kèm SQLSTATE trong meta.code;
    // CHECK/trigger khi dùng Prisma Client => P2004. (Hình dạng `meta` nên được xác nhận khi chạy thật.)
    const sqlstate = sqlState(err);
    if (sqlstate === '23505' || sqlstate === '23503') {
      return res
        .status(409)
        .json(body(ERROR_CODES.CONFLICT, 'Dữ liệu xung đột với dữ liệu hiện có', req));
    }
    if (sqlstate === '23514' || sqlstate === '23001' || err.code === 'P2004') {
      return res
        .status(409)
        .json(
          body(ERROR_CODES.INVALID_STATE, 'Thao tác vi phạm quy tắc nghiệp vụ của hệ thống', req),
        );
    }

    // Lỗi Prisma thường gặp
    if (err.code === 'P2002') {
      return res
        .status(409)
        .json(body(ERROR_CODES.CONFLICT, 'Dữ liệu đã tồn tại (trùng giá trị duy nhất)', req));
    }
    if (err.code === 'P2025') {
      return res.status(404).json(body(ERROR_CODES.NOT_FOUND, 'Không tìm thấy bản ghi', req));
    }

    (req.log || logger).error({ err }, 'Unhandled error');
    return res
      .status(500)
      .json(body(ERROR_CODES.INTERNAL_ERROR, 'Lỗi hệ thống, vui lòng thử lại sau', req));
  };
}

module.exports = { errorHandler, notFoundHandler };
