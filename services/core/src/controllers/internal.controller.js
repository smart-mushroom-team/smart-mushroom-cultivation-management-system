'use strict';

const { notImplemented } = require('@mushroom/shared');

// Chỉ gọi giữa các service, bảo vệ bằng X-Service-Key. KHÔNG được Gateway định tuyến ra ngoài.
// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // GET /rooms/:roomId/access — BR-08: Monitoring hỏi quyền xem phòng của Customer (?customerId=)
  checkRoomAccess: notImplemented('internal.checkRoomAccess'),
  // POST /alerts — FR-36/38: Monitoring yêu cầu tạo cảnh báo cho STAFF, idempotent theo dedupeKey (BR-14)
  createAlert: notImplemented('internal.createAlert'),
};
