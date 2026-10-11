'use strict';

/**
 * Kiểm tra dữ liệu đầu vào bằng zod. Kết quả đã parse nằm ở req.validated.{body,query,params}
 * (Express 5: req.query chỉ đọc nên không ghi đè được).
 *
 *   router.post('/', validate({ body: createRoomSchema }), controller.create);
 */
function validate({ body, query, params } = {}) {
  return (req, _res, next) => {
    try {
      req.validated = {
        body: body ? body.parse(req.body) : req.body,
        query: query ? query.parse(req.query) : req.query,
        params: params ? params.parse(req.params) : req.params,
      };
      next();
    } catch (err) {
      next(err); // errorHandler đổi ZodError thành 422 VALIDATION_ERROR
    }
  };
}

module.exports = { validate };
