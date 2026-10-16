const { AppError } = require('../../../../libs/shared/src/errors');
const { ERROR_CODES } = require('../../../../libs/shared/src/constants');
const repo = require('../repositories/room.repository');

// Tầng service: luật nghiệp vụ, không biết gì về req/res.

// Điểm duy nhất tạo lỗi nghiệp vụ. Nếu constructor AppError của dự án có thứ tự tham số
// khác (code, message, status, details), chỉ cần sửa đúng hàm này.
const fail = (status, code, message) => new AppError(status, code, message);

function toDto(room) {
  return {
    id: room.id,
    name: room.name,
    status: room.status,
    trayCount: room._count ? room._count.trays : undefined,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

async function getRoomOrThrow(id) {
  const room = await repo.findById(id);
  if (!room) throw fail(404, ERROR_CODES.NOT_FOUND, 'Không tìm thấy phòng');
  return room;
}

async function assertNameAvailable(name, excludeId) {
  const duplicate = await repo.findByName(name, excludeId);
  if (duplicate) {
    throw fail(409, ERROR_CODES.CONFLICT, 'Tên phòng đã tồn tại');
  }
}

async function createRoom(data) {
  await assertNameAvailable(data.name);
  const room = await repo.create(data);
  return toDto(room);
}

async function listRooms({ page, pageSize, filters }) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.q) where.name = { contains: filters.q, mode: 'insensitive' };

  const { items, total } = await repo.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    items: items.map(toDto),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

async function getRoom(id) {
  const room = await getRoomOrThrow(id);
  const trayStats = await repo.getTrayStats(id);
  return { ...toDto(room), trayStats };
}

async function updateRoom(id, data) {
  await getRoomOrThrow(id);
  await assertNameAvailable(data.name, id);
  const room = await repo.update(id, data);
  return toDto(room);
}

// Bật/tắt phòng. Không cho tắt khi còn khay đang giữ chỗ hoặc đang cho thuê,
// vì khách đang sử dụng khay trong phòng đó.
async function changeStatus(id, status) {
  const room = await getRoomOrThrow(id);

  if (room.status === status) {
    throw fail(
      409,
      ERROR_CODES.INVALID_STATE,
      status === 'ACTIVE' ? 'Phòng đã ở trạng thái hoạt động' : 'Phòng đã ngừng hoạt động',
    );
  }

  if (status === 'INACTIVE') {
    const inUse = await repo.countInUseTrays(id);
    if (inUse > 0) {
      throw fail(
        409,
        ERROR_CODES.INVALID_STATE,
        `Không thể ngừng hoạt động: còn ${inUse} khay đang được giữ chỗ hoặc cho thuê`,
      );
    }
  }

  const updated = await repo.update(id, { status });
  return toDto(updated);
}

/** @type {import('./room.types').IRoomService} */
module.exports = {
  createRoom,
  listRooms,
  getRoom,
  updateRoom,
  changeStatus,
};
