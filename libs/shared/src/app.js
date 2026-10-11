'use strict';

const express = require('express');
const { requestId } = require('./middleware/requestId');
const { httpLogger } = require('./middleware/httpLogger');

/**
 * Khung Express chung cho Identity / Core / Monitoring:
 * request id, access log, JSON body, GET /health.
 * Service tự gắn routes, rồi gắn notFoundHandler + errorHandler(logger) ở cuối.
 */
function createBaseApp({ serviceName, logger, jsonLimit = '1mb' }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestId());
  app.use(httpLogger(logger));
  app.use(express.json({ limit: jsonLimit }));
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: serviceName, time: new Date().toISOString() });
  });
  return app;
}

module.exports = { createBaseApp };
