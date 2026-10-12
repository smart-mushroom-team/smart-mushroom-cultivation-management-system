'use strict';

const { z, ROLES } = require('@mushroom/shared');

// Email được chuẩn hóa (cắt khoảng trắng, chữ thường) TRƯỚC khi kiểm tra: DB bắt buộc email chữ thường.
const email = z.string().trim().toLowerCase().email('Email không hợp lệ').max(254, 'Email quá dài');

// bcrypt chỉ dùng 72 byte đầu của mật khẩu, nên giới hạn theo BYTE (ký tự tiếng Việt chiếm 2-3 byte).
const password = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .refine((s) => Buffer.byteLength(s, 'utf8') <= 72, 'Mật khẩu tối đa 72 byte');

const name = z
  .string()
  .trim()
  .min(1, 'Họ tên không được để trống')
  .max(100, 'Họ tên tối đa 100 ký tự');

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s\-().]{5,19}$/, 'Số điện thoại không hợp lệ');

const address = z.string().trim().max(255, 'Địa chỉ tối đa 255 ký tự');

const role = z.enum(Object.values(ROLES), { error: 'Vai trò không hợp lệ' });
const status = z.enum(['ACTIVE', 'INACTIVE'], { error: 'Trạng thái không hợp lệ' });

// z.guid(): chấp nhận mọi UUID đúng dạng (z.uuid() của zod 4 kiểm cả bit phiên bản, quá chặt cho dữ liệu mẫu)
const idParams = z.object({ id: z.guid('Mã không hợp lệ') });

/** Cập nhật một phần: cần ít nhất một trường. */
const atLeastOne = (schema) =>
  schema.refine((o) => Object.keys(o).length > 0, {
    message: 'Cần ít nhất một trường để cập nhật',
  });

module.exports = { email, password, name, phone, address, role, status, idParams, atLeastOne };
