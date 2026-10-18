'use strict';

const pino = require('pino');

/**
 * Logger dùng chung. LOG_LEVEL (mặc định info), LOG_PRETTY=true để in dễ đọc khi dev.
 * Không log mật khẩu, token, API key (đã redact các header nhạy cảm).
 */
function createLogger(service) {
  const options = {
    level: process.env.LOG_LEVEL || 'info',
    base: { service },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers["x-device-key"]',
        'req.headers["x-service-key"]',
        'req.headers.cookie',
      ],
      censor: '[REDACTED]',
    },
  };
  if (process.env.LOG_PRETTY === 'true') {
    options.transport = { target: 'pino-pretty', options: { colorize: true } };
  }
  return pino(options);
}

module.exports = { createLogger };
