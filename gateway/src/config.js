'use strict';

const { requireEnv, optionalEnv, intEnv, boolEnv } = require('@mushroom/shared');

function loadConfig() {
  return {
    port: intEnv('GATEWAY_PORT', 8080),
    jwtSecret: requireEnv('JWT_SECRET'),
    corsOrigins: optionalEnv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    // Khởi động nguội trên Render có thể mất tới ~1 phút (FR-50, NFR-14)
    timeoutMs: intEnv('GATEWAY_TIMEOUT_MS', 60000),
    // Ảnh snapshot tối đa 2 MB (FR-49)
    maxBodyBytes: intEnv('GATEWAY_MAX_BODY_BYTES', 2 * 1024 * 1024),
    rateLimitPerMinute: intEnv('GATEWAY_RATE_LIMIT_PER_MIN', 600),
    trustProxy: boolEnv('TRUST_PROXY', false),
    targets: {
      identity: optionalEnv('IDENTITY_URL', 'http://localhost:3001'),
      core: optionalEnv('CORE_URL', 'http://localhost:3002'),
      monitoring: optionalEnv('MONITORING_URL', 'http://localhost:3003'),
    },
  };
}

module.exports = { loadConfig };
