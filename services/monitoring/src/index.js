'use strict';

const { createLogger } = require('@mushroom/shared');
const { loadConfig } = require('./config');
const { createApp } = require('./app');
const { startJobs } = require('./jobs');
const { disconnectPrisma } = require('./config/prisma');

const logger = createLogger('monitoring');
const config = loadConfig();
const app = createApp({ config, logger });

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Monitoring Service đã khởi động');
});

const jobs = startJobs({ config, logger });

function shutdown(signal) {
  logger.info({ signal }, 'Đang tắt Monitoring Service');
  jobs.stop();
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
