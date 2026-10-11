'use strict';

const { AppError, ERROR_CODES } = require('@mushroom/shared');

/**
 * FR-49: không bao giờ định tuyến /internal ra ngoài.
 * Chặn mọi đường dẫn có segment "internal" (kể cả dạng mã hóa %69nternal, "//internal")
 * và segment ".." (tránh vượt thư mục). Trả 404 để không lộ sự tồn tại của endpoint.
 */
function blockInternal() {
  return (req, _res, next) => {
    let decoded;
    try {
      decoded = decodeURIComponent(req.path);
    } catch {
      return next(new AppError(400, ERROR_CODES.BAD_REQUEST, 'Đường dẫn không hợp lệ'));
    }
    const segments = decoded
      .split('/')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (segments.includes('..')) {
      return next(new AppError(400, ERROR_CODES.BAD_REQUEST, 'Đường dẫn không hợp lệ'));
    }
    if (segments.includes('internal')) {
      return next(new AppError(404, ERROR_CODES.NOT_FOUND, 'Không tìm thấy tài nguyên'));
    }
    return next();
  };
}

/**
 * Giới hạn kích thước body theo header Content-Length (FR-49).
 * Gateway không đọc body (chỉ stream qua proxy) nên không tự đếm byte; Monitoring
 * vẫn giới hạn lại bằng multer (BR-10).
 */
function limitBodySize(maxBytes) {
  return (req, _res, next) => {
    const length = Number.parseInt(req.headers['content-length'] || '0', 10);
    if (length > maxBytes) {
      return next(
        new AppError(413, ERROR_CODES.PAYLOAD_TOO_LARGE, `Dữ liệu vượt quá ${maxBytes} byte`),
      );
    }
    return next();
  };
}

/** Route Identity không cần JWT: đăng ký, đăng nhập, làm mới token, đăng xuất (BR-17). */
const PUBLIC_IDENTITY_ROUTES = new Set([
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/refresh',
  'POST /auth/logout',
]);

/** Dùng trong app.use('/api/identity', ...): req.path đã bỏ tiền tố mount. */
function isPublicIdentityRoute(req) {
  const path = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
  return PUBLIC_IDENTITY_ROUTES.has(`${req.method} ${path}`);
}

module.exports = { blockInternal, limitBodySize, isPublicIdentityRoute };
