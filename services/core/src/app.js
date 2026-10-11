'use strict';

const { createBaseApp, notFoundHandler, errorHandler } = require('@mushroom/shared');
const { getPrisma } = require('./config/prisma');
const { createRoutes } = require('./routes');

function createApp({ config, logger }) {
  const app = createBaseApp({ serviceName: 'core', logger });

  // Kiểm tra kết nối DB (khác /health: /health chỉ cho biết tiến trình còn sống)
  app.get('/health/ready', async (_req, res) => {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: 'up' });
    } catch (err) {
      logger.warn({ err: err.message }, 'Kiểm tra DB thất bại');
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  app.use(createRoutes(config));
  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}

module.exports = { createApp };
