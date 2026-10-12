'use strict';

const crypto = require('node:crypto');
const { signAccessToken, verifyAccessToken } = require('@mushroom/shared');

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Access token: JWT HS256, hạn ngắn (BR-16), tự chứa sub/role/name để các service khác xác thực cục bộ.
 * Refresh token: chuỗi ngẫu nhiên 384 bit, chỉ lưu băm SHA-256 trong DB, được XOAY VÒNG mỗi lần dùng.
 */
function createTokenService({ secret, expiresIn, refreshTtlDays }) {
  return {
    hash,

    signAccess(user) {
      const accessToken = signAccessToken(
        { id: user.id, role: user.role, name: user.name },
        { secret, expiresIn },
      );
      const payload = verifyAccessToken(accessToken, secret);
      return { accessToken, expiresIn: payload.exp - payload.iat }; // giây, để client biết khi nào làm mới
    },

    newRefresh(now) {
      const token = crypto.randomBytes(48).toString('base64url');
      const expiresAt = new Date(now.getTime() + refreshTtlDays * 24 * 60 * 60 * 1000);
      return { token, hash: hash(token), expiresAt };
    },
  };
}

module.exports = { createTokenService };
