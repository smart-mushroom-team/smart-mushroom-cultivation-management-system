'use strict';

const { createProxyMiddleware } = require('http-proxy-middleware');
const { ERROR_CODES } = require('@mushroom/shared');

/** Ánh xạ lỗi kết nối của proxy sang 502/503/504 chuẩn (FR-50). */
function mapProxyError(err) {
  const code = err && err.code;
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return [503, ERROR_CODES.SERVICE_UNAVAILABLE, 'Dịch vụ phía sau chưa sẵn sàng'];
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'UND_ERR_HEADERS_TIMEOUT') {
    return [504, ERROR_CODES.GATEWAY_TIMEOUT, 'Dịch vụ phía sau phản hồi quá chậm'];
  }
  return [502, ERROR_CODES.BAD_GATEWAY, 'Lỗi khi chuyển tiếp request tới dịch vụ phía sau'];
}

/**
 * Tạo proxy tới một service, dùng với app.use('<tiền tố>', proxy).
 * http-proxy-middleware v4 chuyển tiếp đường dẫn ĐÃ BỊ Express bỏ tiền tố mount, rồi nối vào path của target:
 *   app.use('/api/core', proxy({ target: 'http://core:3002' }))      /api/core/rooms -> /rooms
 *   app.use('/iot',      proxy({ target: 'http://monitoring:3003/iot' })) /iot/x     -> /iot/x
 * @param {string} target URL service (kèm tiền tố nếu muốn giữ lại đường dẫn)
 */
function createServiceProxy({ target, timeoutMs, logger }) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    // Chỉ đặt proxyTimeout (thời gian chờ service phía sau trả lời => 504). KHÔNG đặt option `timeout`:
    // nó thêm một listener 'timeout' vào socket của client cho MỖI request, tích tụ vô hạn trên kết nối
    // keep-alive (rò rỉ listener, cảnh báo MaxListenersExceededWarning sau 10 request).
    proxyTimeout: timeoutMs,
    logger: { info: () => {}, warn: (m) => logger.warn(m), error: (m) => logger.error(m) },
    on: {
      error: (err, req, res) => {
        logger.warn({ err: err.message, code: err.code, target, requestId: req.id }, 'Proxy error');
        // res có thể là Socket khi WebSocket upgrade: bỏ qua.
        if (!res || typeof res.writeHead !== 'function' || res.headersSent) return;
        const [status, code, message] = mapProxyError(err);
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code, message, requestId: req.id } }));
      },
    },
  });
}

module.exports = { createServiceProxy, mapProxyError };
