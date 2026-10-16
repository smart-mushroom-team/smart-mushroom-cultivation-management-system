const { z } = require('zod');

const OCCUPANCY_STATUSES = ['AVAILABLE', 'RESERVED', 'RENTED', 'CLEANING'];

const statusBodySchema = z.object({
  occupancyStatus: z.enum(OCCUPANCY_STATUSES),
});

const idParamSchema = z.object({
  id: z.string().uuid('ID khay không hợp lệ'),
});

const roomId = z.string().uuid('ID phòng không hợp lệ');
const trayCode = z
  .string({
    required_error: 'Mã khay là bắt buộc',
    invalid_type_error: 'Mã khay phải là chuỗi',
  })
  .trim()
  .min(1, 'Mã khay là bắt buộc')
  .max(100, 'Mã khay tối đa 100 ký tự')
  .transform((value) => value.replace(/\s+/g, ' '));

const location = z
  .number({ invalid_type_error: 'Vị trí phải là số nguyên dương' })
  .int('Vị trí phải là số nguyên')
  .min(1, 'Vị trí phải lớn hơn 0');

const createBodySchema = z.object({
  trayCode,
  roomId,
  locationRow: location,
  locationShelf: location,
  locationSlot: location,
});

const updateBodySchema = createBodySchema;

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  roomId: z.preprocess((value) => (value === '' ? undefined : value), roomId.optional()),
  occupancyStatus: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(OCCUPANCY_STATUSES).optional(),
  ),
  trayCode: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().min(1).max(100).optional(),
  ),
});

module.exports = {
  idParamSchema,
  createBodySchema,
  updateBodySchema,
  statusBodySchema,
  listQuerySchema,
};
