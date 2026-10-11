'use strict';

const pinoHttp = require('pino-http');

/** Access log: mỗi request một dòng, kèm requestId. */
function httpLogger(logger) {
  return pinoHttp({
    logger,
    genReqId: (req) => req.id,
    autoLogging: { ignore: (req) => req.url === '/health' },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  });
}

module.exports = { httpLogger };
