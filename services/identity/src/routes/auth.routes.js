'use strict';

const { Router } = require('express');
const { validate } = require('@mushroom/shared');
const v = require('../validators/auth.validator');

/** Công khai (không cần JWT): đăng ký, đăng nhập, làm mới token, đăng xuất. */
function createAuthRoutes(controller) {
  const router = Router();
  router.post('/register', validate({ body: v.registerBody }), controller.register);
  router.post('/login', validate({ body: v.loginBody }), controller.login);
  router.post('/refresh', validate({ body: v.refreshBody }), controller.refresh);
  router.post('/logout', validate({ body: v.refreshBody }), controller.logout);
  return router;
}

module.exports = { createAuthRoutes };
