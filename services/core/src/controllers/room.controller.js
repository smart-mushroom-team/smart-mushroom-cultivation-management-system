const service = require('../services/room.service');
const {
  idParamSchema,
  createBodySchema,
  updateBodySchema,
  statusBodySchema,
  listQuerySchema,
} = require('../validators/room.validator');

// Tầng controller: đọc request, gọi service, trả response. Không chứa luật nghiệp vụ.
// Lỗi validation (ZodError) được errorHandler dùng chung xử lý.

async function create(req, res) {
  const data = createBodySchema.parse(req.body);
  const room = await service.createRoom(data);
  res.status(201).json({ data: room });
}

async function list(req, res) {
  const { page, pageSize, status, q } = listQuerySchema.parse(req.query);
  const { items, meta } = await service.listRooms({
    page,
    pageSize,
    filters: { status, q },
  });
  res.json({ data: items, meta });
}

async function getOne(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const room = await service.getRoom(id);
  res.json({ data: room });
}

async function update(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const data = updateBodySchema.parse(req.body);
  const room = await service.updateRoom(id, data);
  res.json({ data: room });
}

async function changeStatus(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const { status } = statusBodySchema.parse(req.body);
  const room = await service.changeStatus(id, status);
  res.json({ data: room });
}

module.exports = { create, list, getById: getOne, update, changeStatus };
