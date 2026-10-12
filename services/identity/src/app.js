'use strict';

const { createBaseApp, notFoundHandler, errorHandler } = require('@mushroom/shared');
const { buildContainer } = require('./container');
const { createRoutes } = require('./routes');

const realClock = { now: () => new Date() };

/**
 * @param {object} deps
 * @param {object} deps.config  cấu hình (xem config/index.js)
 * @param {object} deps.logger
 * @param {object} deps.db      giao diện { query, transaction } (createPrismaDb hoặc adapter test)
 * @param {object} [deps.clock] { now() } — test truyền đồng hồ giả để "tua" thời gian
 */
function createApp({ config, logger, db, clock = realClock }) {
  const app = createBaseApp({ serviceName: 'identity', logger });

  // Kiểm tra kết nối DB (khác /health: /health chỉ cho biết tiến trình còn sống)
  app.get('/health/ready', async (_req, res) => {
    try {
      await db.query('SELECT 1 AS ok');
      res.json({ status: 'ok', db: 'up' });
    } catch (err) {
      logger.warn({ err: err.message }, 'Kiểm tra DB thất bại');
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  const { controllers } = buildContainer({ config, db, logger, clock });
  app.use(createRoutes({ config, controllers }));
  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}

module.exports = { createApp };
