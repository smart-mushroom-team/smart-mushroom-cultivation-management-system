'use strict';

const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const {
  requestId,
  httpLogger,
  authenticate,
  notFoundHandler,
  errorHandler,
  ERROR_CODES,
} = require('@mushroom/shared');
const { blockInternal, limitBodySize, isPublicIdentityRoute } = require('./middleware');
const { createServiceProxy } = require('./proxy');

/**
 * API Gateway: điểm vào duy nhất (FR-47). Chỉ định tuyến, kiểm JWT sơ bộ, CORS,
 * giới hạn body, log. KHÔNG chứa nghiệp vụ, KHÔNG có cơ sở dữ liệu (BR-17).
 *
 *   /api/identity/**  -> Identity  (bỏ tiền tố; đăng ký/đăng nhập/refresh không cần JWT)
 *   /api/core/**      -> Core      (cần JWT, bỏ tiền tố)
 *   /api/monitoring/**-> Monitoring(cần JWT, bỏ tiền tố)
 *   /iot/**           -> Monitoring(không JWT; Monitoring kiểm X-Device-Key; giữ nguyên đường dẫn)
 *   /internal/**      -> chặn
 */
function createApp({ config, logger }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(requestId());
  app.use(httpLogger(logger));
  app.use(cors({ origin: config.corsOrigins, exposedHeaders: ['X-Request-Id', 'X-Captured-At'] }));
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: config.rateLimitPerMinute,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/health',
      handler: (req, res) =>
        res.status(429).json({
          error: {
            code: ERROR_CODES.TOO_MANY_REQUESTS,
            message: 'Quá nhiều request, vui lòng thử lại sau',
            requestId: req.id,
          },
        }),
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'gateway', time: new Date().toISOString() });
  });

  app.use(blockInternal());
  app.use(limitBodySize(config.maxBodyBytes));

  const auth = authenticate(config.jwtSecret);
  const proxyOpts = { timeoutMs: config.timeoutMs, logger };

  app.use(
    '/api/identity',
    (req, res, next) => (isPublicIdentityRoute(req) ? next() : auth(req, res, next)),
    createServiceProxy({ target: config.targets.identity, ...proxyOpts }),
  );
  app.use('/api/core', auth, createServiceProxy({ target: config.targets.core, ...proxyOpts }));
  app.use(
    '/api/monitoring',
    auth,
    createServiceProxy({ target: config.targets.monitoring, ...proxyOpts }),
  );
  // /iot/** giữ nguyên đường dẫn: đưa tiền tố /iot vào target
  app.use('/iot', createServiceProxy({ target: `${config.targets.monitoring}/iot`, ...proxyOpts }));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}

module.exports = { createApp };
