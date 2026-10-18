'use strict';

const { Router } = require('express');
const { authenticate } = require('@mushroom/shared');
const { createRoomAccess } = require('../middlewares/roomAccess');
const { createSnapshotUpload } = require('../middlewares/upload');
const { createIotRoutes } = require('./iot.routes');

/**
 * Bảng định tuyến của Monitoring Service.
 *   /iot/**                       thiết bị (X-Device-Key), Gateway giữ nguyên đường dẫn
 *   /devices/**                   Admin/Operator quản lý thiết bị (đường dẫn đã bỏ /api/monitoring)
 *   /rooms/:roomId/threshold      Admin/Operator cấu hình ngưỡng
 *   /rooms/:roomId/camera|sensor  Admin/Operator xem tất cả; Customer phải qua roomAccess (BR-08)
 */
function createRoutes({ config, logger }) {
  const router = Router();
  const auth = authenticate(config.jwtSecret);
  const roomAccess = createRoomAccess({
    coreUrl: config.coreUrl,
    serviceKey: config.serviceKey,
    timeoutMs: config.roomAccessTimeoutMs,
    logger,
  });
  const upload = createSnapshotUpload({ maxBytes: config.maxSnapshotBytes });

  router.use('/iot', createIotRoutes({ upload }));
  router.use('/devices', auth, require('./device.routes'));
  router.use('/rooms/:roomId/threshold', auth, require('./threshold.routes'));
  router.use('/rooms/:roomId', auth, roomAccess, require('./room-view.routes'));

  return router;
}

module.exports = { createRoutes };
