'use strict';

const { notImplemented } = require('@mushroom/shared');

// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // GET / — FR-17, UC-04: "Khay của tôi"
  list: notImplemented('myTray.list'),
  // GET /:trayId — FR-17: chi tiết khay (kèm roomId để gọi Monitoring)
  getById: notImplemented('myTray.getById'),
};
