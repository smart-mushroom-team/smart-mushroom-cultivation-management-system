'use strict';

const userRepo = require('./repositories/user.repository');
const tokenRepo = require('./repositories/refresh-token.repository');
const { createPasswordService } = require('./services/password.service');
const { createTokenService } = require('./services/token.service');
const { createAuthService } = require('./services/auth.service');
const { createUserService } = require('./services/user.service');
const { createAuthController } = require('./controllers/auth.controller');
const { createMeController } = require('./controllers/me.controller');
const { createUserController } = require('./controllers/user.controller');

/**
 * Nơi DUY NHẤT lắp ráp các tầng: repositories -> services -> controllers.
 * `db` và `clock` được truyền từ ngoài vào (production: Prisma + giờ thật; test: PGlite + giờ giả).
 */
function buildContainer({ config, db, logger, clock }) {
  const passwords = createPasswordService({ rounds: config.bcryptRounds });
  const tokens = createTokenService({
    secret: config.jwtSecret,
    expiresIn: config.jwtExpiresIn,
    refreshTtlDays: config.refreshTokenTtlDays,
  });

  const authService = createAuthService({
    db,
    userRepo,
    tokenRepo,
    passwords,
    tokens,
    config,
    logger,
    clock,
  });
  const userService = createUserService({ db, userRepo, tokenRepo, passwords, clock });

  return {
    controllers: {
      auth: createAuthController({ authService }),
      me: createMeController({ userService }),
      user: createUserController({ userService }),
    },
  };
}

module.exports = { buildContainer };
