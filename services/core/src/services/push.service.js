'use strict';

const { createLogger } = require('@mushroom/shared');
const { getMessaging } = require('../config/firebase');

const logger = createLogger('core-push');
const FCM_BATCH_SIZE = 500; // giới hạn của sendEachForMulticast
const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/** FCM yêu cầu mọi giá trị trong `data` phải là chuỗi. */
function stringifyData(data = {}) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));
}

/**
 * Gửi push qua FCM tới danh sách token.
 *
 * QUY TẮC QUAN TRỌNG: hàm này KHÔNG BAO GIỜ ném lỗi. Thông báo luôn được lưu vào DB trước
 * (nguồn sự thật); FCM chỉ là kênh đẩy thêm. Gửi lỗi => ghi log, giao dịch nghiệp vụ không bị ảnh hưởng.
 *
 * Trả về { sent, failed, skipped?, invalidTokens } — invalidTokens nên được xóa khỏi bảng DeviceToken.
 */
async function sendToTokens(tokens, { title, body, data } = {}, { dryRun = true } = {}) {
  const result = { sent: 0, failed: 0, invalidTokens: [] };
  if (!tokens || tokens.length === 0) return result;

  let messaging;
  try {
    messaging = getMessaging();
  } catch (err) {
    logger.error({ err: err.message }, 'Khởi tạo Firebase thất bại');
    return { ...result, skipped: 'FCM_INIT_ERROR' };
  }
  if (!messaging) {
    logger.warn('Chưa cấu hình Firebase service account, bỏ qua gửi push');
    return { ...result, skipped: 'FCM_NOT_CONFIGURED' };
  }

  for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
    const batch = tokens.slice(i, i + FCM_BATCH_SIZE);
    try {
      const res = await messaging.sendEachForMulticast(
        { tokens: batch, notification: { title, body }, data: stringifyData(data) },
        dryRun,
      );
      result.sent += res.successCount;
      result.failed += res.failureCount;
      res.responses.forEach((r, idx) => {
        if (!r.success && r.error && INVALID_TOKEN_CODES.has(r.error.code)) {
          result.invalidTokens.push(batch[idx]);
        }
      });
    } catch (err) {
      logger.error({ err: err.message }, 'Gửi FCM thất bại');
      result.failed += batch.length;
    }
  }
  return result;
}

module.exports = { sendToTokens, stringifyData };
