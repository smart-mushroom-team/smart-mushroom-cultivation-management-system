'use strict';

const crypto = require('node:crypto');
const { HEADERS } = require('../constants');

/**
 * Gắn X-Request-Id: dùng lại id do Gateway gửi tới, nếu chưa có thì tự sinh.
 * Ghi ngược vào request header để proxy chuyển tiếp xuống service phía sau.
 */
function requestId() {
  return (req, res, next) => {
    const incoming = req.headers[HEADERS.REQUEST_ID];
    const id =
      typeof incoming === 'string' && incoming.length <= 100 ? incoming : crypto.randomUUID();
    req.id = id;
    req.headers[HEADERS.REQUEST_ID] = id;
    res.setHeader('X-Request-Id', id);
    next();
  };
}

module.exports = { requestId };
