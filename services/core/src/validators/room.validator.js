const { z } = require('zod');

// Validation bằng Zod. ZodError sẽ được errorHandler dùng chung chuyển thành 422 VALIDATION_ERROR.

const ROOM_STATUSES = ['ACTIVE', 'INACTIVE'];

const roomName = z
  .string({
    required_error: 'Tên phòng là bắt buộc',
    invalid_type_error: 'Tên phòng phải là chuỗi',
  })
  .trim()
  .min(1, 'Tên phòng là bắt buộc')
  .max(100, 'Tên phòng tối đa 100 ký tự')
  .transform((s) => s.replace(/\s+/g, ' '));

const roomStatus = z.enum(ROOM_STATUSES, {
  errorMap: () => ({ message: `Trạng thái phải là một trong: ${ROOM_STATUSES.join(', ')}` }),
});

// Chuỗi rỗng trên query (?status=) coi như không lọc.
const emptyToUndefined = (v) => (v === '' ? undefined : v);

const idParamSchema = z.object({
  id: z.string().uuid('ID phòng không hợp lệ'),
});

const createBodySchema = z.object({
  name: roomName,
  status: roomStatus.optional(),
});

// Sửa thông tin: chỉ cho đổi tên. Đổi trạng thái đi qua endpoint riêng.
const updateBodySchema = z.object({
  name: roomName,
});

const statusBodySchema = z.object({
  status: roomStatus,
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.preprocess(emptyToUndefined, roomStatus.optional()),
  q: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(100).optional()),
});

module.exports = {
  idParamSchema,
  createBodySchema,
  updateBodySchema,
  statusBodySchema,
  listQuerySchema,
};
