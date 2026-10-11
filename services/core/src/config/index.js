'use strict';

const { requireEnv, optionalEnv, intEnv, boolEnv } = require('@mushroom/shared');

function loadConfig() {
  return {
    port: intEnv('PORT', 3002),
    jwtSecret: requireEnv('JWT_SECRET'),
    serviceKey: requireEnv('SERVICE_KEY'), // bảo vệ /internal (NFR-06)
    timezone: optionalEnv('APP_TIMEZONE', 'Asia/Ho_Chi_Minh'), // múi giờ nghiệp vụ UTC+7
    demoMode: boolEnv('DEMO_MODE', false), // FR-26: chạy job thủ công + ngày giả lập
    expiryJobCron: optionalEnv('EXPIRY_JOB_CRON', '0 0 * * *'), // 00:00 hằng ngày
    fcm: {
      dryRun: boolEnv('FCM_DRY_RUN', true), // true: chỉ validate message, không gửi thật
    },
  };
}

module.exports = { loadConfig };
