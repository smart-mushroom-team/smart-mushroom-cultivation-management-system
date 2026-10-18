'use strict';

const { notImplemented } = require('@mushroom/shared');

// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // GET / — lọc rentalId, trayId, status, stage
  list: notImplemented('cycle.list'),
  // POST / — FR-21 (mức S): bắt đầu đợt nuôi mới
  create: notImplemented('cycle.create'),
  // GET /:id — Staff hoặc chủ đơn (BR-02); kèm nhật ký tiến độ
  getById: notImplemented('cycle.getById'),
  // POST /:id/progress — FR-18, UC-06: chỉ tiến lên từng bước SEEDING->INCUBATING->FRUITING->READY
  updateProgress: notImplemented('cycle.updateProgress'),
  // POST /:id/harvest — FR-19, UC-07: chỉ khi FRUITING/READY
  harvest: notImplemented('cycle.harvest'),
  // POST /:id/discard — FR-20: lý do bắt buộc
  discard: notImplemented('cycle.discard'),
};
