'use strict';

const { z } = require('@mushroom/shared');
const c = require('./common.validator');

// Hồ sơ cá nhân: KHÔNG sửa được email, vai trò, trạng thái (strictObject sẽ từ chối).
const updateProfileBody = c.atLeastOne(
  z.strictObject({
    name: c.name.optional(),
    phone: c.phone.nullable().optional(),
    address: c.address.nullable().optional(),
  }),
);

const createUserBody = z.strictObject({
  name: c.name,
  email: c.email,
  password: c.password,
  role: c.role,
  phone: c.phone.nullable().optional(),
  address: c.address.nullable().optional(),
});

const updateUserBody = c.atLeastOne(
  z.strictObject({
    name: c.name.optional(),
    role: c.role.optional(),
    phone: c.phone.nullable().optional(),
    address: c.address.nullable().optional(),
  }),
);

const resetPasswordBody = z.strictObject({ newPassword: c.password });

// Query string luôn là chuỗi => z.coerce. Tham số lạ được bỏ qua (object thường, không strict).
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: c.role.optional(),
  status: c.status.optional(),
  q: z.string().trim().max(100).optional(),
});

module.exports = {
  updateProfileBody,
  createUserBody,
  updateUserBody,
  resetPasswordBody,
  listQuery,
};
