'use strict';

const { notImplemented } = require('@mushroom/shared');

// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // GET / — FR-08: lọc roomId, occupancyStatus, tìm theo trayCode, phân trang
  list: notImplemented('tray.list'),
  // POST / — FR-08: trayCode duy nhất, vị trí hàng/kệ/ô
  create: notImplemented('tray.create'),
  // GET /:id — FR-08
  getById: notImplemented('tray.getById'),
  // PATCH /:id — FR-08
  update: notImplemented('tray.update'),
  // DELETE /:id — FR-08, BR-15: chỉ xóa khay chưa từng thuộc đơn nào
  remove: notImplemented('tray.remove'),
  // POST /:id/complete-cleaning — FR-09, UC-08: CLEANING -> AVAILABLE
  completeCleaning: notImplemented('tray.completeCleaning'),
};
