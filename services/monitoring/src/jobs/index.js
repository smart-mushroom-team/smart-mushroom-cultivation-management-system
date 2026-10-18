'use strict';

/**
 * Tiến trình nền của Monitoring Service. Mọi job phải idempotent (BR-14).
 *
 * TODO — Device Status Scheduler (UC-12, FR-36, BR-11), mặc định 10 giây:
 *   thiết bị ACTIVE có now - lastSeen > 3 x intervalSec thì ONLINE -> OFFLINE và yêu cầu Core
 *   tạo cảnh báo (POST {CORE_INTERNAL_URL}/internal/alerts, kèm dedupeKey). Ngược lại OFFLINE -> ONLINE.
 *   Core lỗi: lưu vào PendingAlert và thử lại ở lần chạy sau.
 *
 * TODO — Telemetry Retention Job (BR-13): hằng ngày xóa SensorReading cũ hơn 7 ngày.
 * TODO — Snapshot persist (FR-31): cứ 60 giây (và khi camera OFFLINE) ghi latest snapshot vào CameraLatest.
 */
function startJobs({ logger }) {
  logger.info('Chưa có job nền nào được cài đặt (xem src/jobs/index.js)');
  return { stop: () => {} };
}

module.exports = { startJobs };
