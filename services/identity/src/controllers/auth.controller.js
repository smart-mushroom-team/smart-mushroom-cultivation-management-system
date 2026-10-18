'use strict';

/**
 * Controller chỉ làm việc với HTTP: lấy dữ liệu ĐÃ KIỂM TRA từ req.validated, gọi service, trả response.
 * Không chứa quy tắc nghiệp vụ, không truy cập DB. (Express 5 tự chuyển lỗi của hàm async tới errorHandler.)
 */
function createAuthController({ authService }) {
  return {
    register: async (req, res) => {
      res.status(201).json(await authService.register(req.validated.body));
    },
    login: async (req, res) => {
      res.json(await authService.login(req.validated.body));
    },
    refresh: async (req, res) => {
      res.json(await authService.refresh(req.validated.body));
    },
    logout: async (req, res) => {
      await authService.logout(req.validated.body);
      res.status(204).end();
    },
  };
}

module.exports = { createAuthController };
