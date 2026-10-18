'use strict';

const jwt = require('jsonwebtoken');

const ALGORITHM = 'HS256';

/**
 * Identity ký access token. Payload theo BR-16: sub (mã người dùng), role, name.
 * Các service khác chỉ gọi verifyAccessToken với cùng JWT_SECRET (HS256).
 */
function signAccessToken({ id, role, name }, { secret, expiresIn = '1h' }) {
  return jwt.sign({ role, name }, secret, { algorithm: ALGORITHM, subject: id, expiresIn });
}

/** Ném JsonWebTokenError / TokenExpiredError nếu sai; luôn ép thuật toán HS256. */
function verifyAccessToken(token, secret) {
  return jwt.verify(token, secret, { algorithms: [ALGORITHM] });
}

module.exports = { signAccessToken, verifyAccessToken, ALGORITHM };
