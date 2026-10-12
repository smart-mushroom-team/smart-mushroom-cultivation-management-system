'use strict';

const { Router } = require('express');
const { validate } = require('@mushroom/shared');
const v = require('../validators/user.validator');
const { idParams } = require('../validators/common.validator');

/** Chỉ ADMIN (authenticate + requireRole đặt ở routes/index.js). */
function createUserRoutes(controller) {
  const router = Router();
  const withId = validate({ params: idParams });

  router.get('/', validate({ query: v.listQuery }), controller.list);
  router.post('/', validate({ body: v.createUserBody }), controller.create);
  router.get('/:id', withId, controller.getById);
  router.patch('/:id', validate({ params: idParams, body: v.updateUserBody }), controller.update);
  router.post('/:id/deactivate', withId, controller.deactivate);
  router.post('/:id/activate', withId, controller.activate);
  router.post(
    '/:id/reset-password',
    validate({ params: idParams, body: v.resetPasswordBody }),
    controller.resetPassword,
  );
  return router;
}

module.exports = { createUserRoutes };
