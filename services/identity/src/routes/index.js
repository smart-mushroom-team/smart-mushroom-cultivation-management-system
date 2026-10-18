'use strict';

const { Router } = require('express');
const { authenticate, requireRole, ROLES } = require('@mushroom/shared');
const { createAuthRoutes } = require('./auth.routes');
const { createMeRoutes } = require('./me.routes');
const { createUserRoutes } = require('./user.routes');

/**
 * Bảng phân quyền của Identity Service (đường dẫn đã bỏ tiền tố /api/identity).
 *   /auth/*   công khai (đăng ký, đăng nhập, refresh, logout)
 *   /me       mọi người dùng đã đăng nhập
 *   /users    chỉ ADMIN
 */
function createRoutes({ config, controllers }) {
  const router = Router();
  const auth = authenticate(config.jwtSecret);

  router.use('/auth', createAuthRoutes(controllers.auth));
  router.use('/me', auth, createMeRoutes(controllers.me));
  router.use('/users', auth, requireRole(ROLES.ADMIN), createUserRoutes(controllers.user));

  return router;
}

module.exports = { createRoutes };
