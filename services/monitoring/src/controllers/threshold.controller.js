'use strict';

const { notImplemented } = require('@mushroom/shared');

// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // GET / — FR-37: ngưỡng + trạng thái NORMAL/ABNORMAL từng chỉ số
  get: notImplemented('threshold.get'),
  // PUT / — FR-37, BR-12: min < max, đặt/ghi đè ngưỡng
  upsert: notImplemented('threshold.upsert'),
};
