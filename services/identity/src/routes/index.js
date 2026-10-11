'use strict';

const { Router } = require('express');
const { authenticate, requireRole, ROLES } = require('@mushroom/shared');

/**
 * Bảng phân quyền của Identity Service (đường dẫn đã bỏ tiền tố /api/identity).
 *   /auth/*   công khai (đăng ký, đăng nhập, refresh, logout)
 *   /me       mọi người dùng đã đăng nhập
 *   /users    chỉ ADMIN
 */
function createRoutes(config) {
  const router = Router();
  const auth = authenticate(config.jwtSecret);

  router.use('/auth', require('./auth.routes'));
  router.use('/me', auth, require('./me.routes'));
  router.use('/users', auth, requireRole(ROLES.ADMIN), require('./user.routes'));

  return router;
}

module.exports = { createRoutes };
