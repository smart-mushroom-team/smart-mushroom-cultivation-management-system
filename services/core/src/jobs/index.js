'use strict';

/**
 * Tiến trình nền của Core Service. Mọi job phải IDEMPOTENT (BR-14): chạy lại không tạo
 * thông báo trùng hay chuyển trạng thái sai; lỗi từng bản ghi thì log và thử lại lần sau.
 *
 * TODO — Rental Expiry Job (UC-13, FR-22..25), chạy 00:00 Asia/Ho_Chi_Minh:
 *   1. Nhắc đơn sắp hết hạn (End_Date - 1), mỗi đơn một lần (reminderSentAt).
 *   2. Đơn ACTIVE có End_Date < hôm nay -> EXPIRED (xử lý bù mọi đơn quá hạn nếu lần trước bị lỡ).
 *   3. Đơn EXPIRED còn đợt GROWING -> thông báo STAFF một lần.
 *   4. Đơn EXPIRED mà mọi đợt ở trạng thái cuối -> COMPLETED, khay -> CLEANING.
 *   "Hôm nay" phải lấy từ hàm ngày hiện tại có hỗ trợ ngày giả lập của chế độ demo (FR-26).
 *   Gợi ý: dùng node-cron (npm i node-cron -w services/core) hoặc setInterval kiểm tra theo ngày.
 */
function startJobs({ logger }) {
  logger.info('Chưa có job nền nào được cài đặt (xem src/jobs/index.js)');
  return { stop: () => {} };
}

module.exports = { startJobs };
