'use strict';

const { createLogger } = require('@mushroom/shared');
const { loadConfig } = require('./config');
const { createApp } = require('./app');

const logger = createLogger('gateway');
const config = loadConfig();
const app = createApp({ config, logger });

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, targets: config.targets }, 'API Gateway đã khởi động');
});

function shutdown(signal) {
  logger.info({ signal }, 'Đang tắt Gateway');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
