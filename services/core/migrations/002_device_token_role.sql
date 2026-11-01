-- Bước 3: biết token FCM thuộc vai trò nào để gửi cảnh báo hạ tầng cho Operator/Admin (BR-18).
-- Role lấy từ JWT lúc đăng ký token; đổi người dùng trên cùng một máy thì role cập nhật theo.
ALTER TABLE device_tokens ADD COLUMN role text NOT NULL DEFAULT 'CUSTOMER';
CREATE INDEX ix_device_tokens_user ON device_tokens(user_id);
CREATE INDEX ix_device_tokens_role ON device_tokens(role);
