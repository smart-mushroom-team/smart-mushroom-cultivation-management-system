'use strict';

const { Router } = require('express');
const { validate } = require('@mushroom/shared');
const v = require('../validators/user.validator');

/** Mọi người dùng đã đăng nhập (authenticate đặt ở routes/index.js). */
function createMeRoutes(controller) {
  const router = Router();
  router.get('/', controller.getProfile);
  router.patch('/', validate({ body: v.updateProfileBody }), controller.updateProfile);
  return router;
}

module.exports = { createMeRoutes };
