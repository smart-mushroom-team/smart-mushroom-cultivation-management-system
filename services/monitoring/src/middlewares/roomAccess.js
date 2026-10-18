'use strict';

const {
  hasRole,
  ROLES,
  HEADERS,
  ERROR_CODES,
  forbidden,
  unavailable,
} = require('@mushroom/shared');

/**
 * BR-08 — quyền xem camera/số liệu của một phòng. Dùng sau authenticate, trên route có :roomId.
 *
 *  - Admin/Operator: xem mọi phòng, KHÔNG phụ thuộc Core.
 *  - Customer: hỏi Core ở MỖI request (không cache) để thu hồi quyền có hiệu lực ngay.
 *  - Core lỗi / quá thời gian / trả khác 2xx => từ chối (fail-closed, 503), không bao giờ cho qua.
 *
 * Core trả { allowed: boolean, reason?: string, rentalId?, endDate? } (xem docs/openapi/core.yaml, /internal/...).
 */
function createRoomAccess({ coreUrl, serviceKey, timeoutMs, logger, fetchImpl = fetch }) {
  return async function roomAccess(req, _res, next) {
    const { role, id: userId } = req.user || {};
    if (hasRole(role, [ROLES.OPERATOR])) return next();
    if (role !== ROLES.CUSTOMER) return next(forbidden());

    const url =
      `${coreUrl}/internal/rooms/${encodeURIComponent(req.params.roomId)}/access` +
      `?customerId=${encodeURIComponent(userId)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        headers: { [HEADERS.SERVICE_KEY]: serviceKey, [HEADERS.REQUEST_ID]: req.id },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Core trả HTTP ${response.status}`);
      const decision = await response.json();
      if (decision.allowed === true) {
        req.roomAccess = decision;
        return next();
      }
      return next(forbidden(decision.reason || 'Bạn không có quyền xem phòng này'));
    } catch (err) {
      logger.warn(
        { err: err.message, roomId: req.params.roomId },
        'Không xác minh được quyền xem phòng',
      );
      return next(
        unavailable(
          'Tạm thời chưa xác minh được quyền xem, vui lòng thử lại sau',
          ERROR_CODES.ACCESS_CHECK_UNAVAILABLE,
        ),
      );
    } finally {
      clearTimeout(timer);
    }
  };
}

module.exports = { createRoomAccess };
