'use strict';

const { requireEnv, optionalEnv, intEnv } = require('@mushroom/shared');

function loadConfig() {
  return {
    port: intEnv('PORT', 3001),
    jwtSecret: requireEnv('JWT_SECRET'), // HS256, dùng chung với Gateway/Core/Monitoring
    jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '1h'), // BR-16: tối đa 1 giờ
    refreshTokenTtlDays: intEnv('REFRESH_TOKEN_TTL_DAYS', 7),
    maxFailedLogins: intEnv('MAX_FAILED_LOGINS', 5), // UC-01 2c
    lockMinutes: intEnv('LOCK_MINUTES', 5),
    bcryptRounds: intEnv('BCRYPT_ROUNDS', 10), // chi phí băm mật khẩu (test dùng 4 cho nhanh)
  };
}

module.exports = { loadConfig };
