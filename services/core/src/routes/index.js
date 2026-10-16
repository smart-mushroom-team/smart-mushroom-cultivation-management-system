'use strict';

const { Router } = require('express');
const { authenticate, requireServiceKey } = require('@mushroom/shared');

/**
 * Bảng định tuyến của Core Service (đường dẫn đã bỏ tiền tố /api/core).
 * Quy ước: authenticate đặt ở đây (mức mount), phân quyền theo vai trò đặt trong từng *.routes.js.
 */
function createRoutes(config) {
  const router = Router();
  const auth = authenticate(config.jwtSecret);

  // Chỉ gọi nội bộ giữa các service, KHÔNG đi qua Gateway
  router.use('/internal', requireServiceKey(config.serviceKey), require('./internal.routes'));

  router.use('/rooms', auth, require('./room.routes'));
  router.use('/trays', auth, require('./tray.routes'));
  router.use('/packages', auth, require('./package.routes'));
  router.use('/rentals', auth, require('./rental.routes'));
  router.use('/transactions', auth, require('./transaction.routes'));
  router.use('/my-trays', auth, require('./my-tray.routes'));
  router.use('/cycles', auth, require('./cycle.routes'));
  router.use('/notifications', auth, require('./notification.routes'));
  router.use('/device-tokens', auth, require('./device-token.routes'));
  router.use('/dashboard', auth, require('./dashboard.routes'));
  router.use('/demo', auth, require('./demo.routes'));

  return router;
}

module.exports = { createRoutes };
