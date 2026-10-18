'use strict';

const { verifyAccessToken } = require('../jwt');
const { unauthorized, forbidden } = require('../errors');
const { ROLES, ERROR_CODES, HEADERS } = require('../constants');
const crypto = require('node:crypto');

/**
 * Admin kế thừa mọi quyền của Operator (SRS 2.4):
 * route cho phép OPERATOR thì ADMIN cũng được; route chỉ cho CUSTOMER thì ADMIN không được.
 */
function hasRole(userRole, allowedRoles) {
  if (allowedRoles.includes(userRole)) return true;
  return userRole === ROLES.ADMIN && allowedRoles.includes(ROLES.OPERATOR);
}

/**
 * Xác thực JWT cục bộ (BR-16), gắn req.user = { id, role, name }.
 * Mỗi service và Gateway tự gọi middleware này, không gọi Identity.
 */
function authenticate(secret) {
  return (req, _res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(unauthorized('Thiếu Bearer token'));
    }
    try {
      const payload = verifyAccessToken(token, secret);
      req.user = { id: payload.sub, role: payload.role, name: payload.name };
      return next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(unauthorized('Token đã hết hạn', ERROR_CODES.TOKEN_EXPIRED));
      }
      return next(unauthorized('Token không hợp lệ'));
    }
  };
}

/** Phân quyền theo vai trò. Dùng sau authenticate: router.get('/', requireRole(ROLES.OPERATOR), ...) */
function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!hasRole(req.user.role, allowedRoles)) return next(forbidden());
    return next();
  };
}

/** Bảo vệ endpoint /internal bằng khóa dịch vụ (header X-Service-Key). */
function requireServiceKey(serviceKey) {
  const expected = Buffer.from(serviceKey || '');
  return (req, _res, next) => {
    const given = Buffer.from(String(req.headers[HEADERS.SERVICE_KEY] || ''));
    const ok =
      expected.length > 0 &&
      given.length === expected.length &&
      crypto.timingSafeEqual(given, expected);
    if (!ok) return next(unauthorized('Khóa dịch vụ không hợp lệ'));
    return next();
  };
}

module.exports = { authenticate, requireRole, requireServiceKey, hasRole };
