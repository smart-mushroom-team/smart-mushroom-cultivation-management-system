'use strict';

const { notImplemented } = require('@mushroom/shared');

// TODO: thay từng stub bằng logic thật (controller chỉ nhận/trả request, nghiệp vụ nằm ở services/).
module.exports = {
  // GET / — FR-42: thông báo của mình + thông báo theo vai trò STAFF
  list: notImplemented('notification.list'),
  // GET /unread-count — FR-42
  unreadCount: notImplemented('notification.unreadCount'),
  // POST /read-all — FR-42
  markAllRead: notImplemented('notification.markAllRead'),
  // POST /:id/read — FR-42: trạng thái đã đọc riêng từng người (NotificationRead)
  markRead: notImplemented('notification.markRead'),
};
