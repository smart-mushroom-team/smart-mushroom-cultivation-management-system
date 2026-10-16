const { AppError } = require('../../../../libs/shared/src/errors');
const { ERROR_CODES } = require('../../../../libs/shared/src/constants');
const repo = require('../repositories/tray.repository');

const fail = (status, code, message) => new AppError(status, code, message);

function toDto(tray) {
  return {
    id: tray.id,
    trayCode: tray.trayCode,
    roomId: tray.roomId,
    locationRow: tray.locationRow,
    locationShelf: tray.locationShelf,
    locationSlot: tray.locationSlot,
    occupancyStatus: tray.occupancyStatus,
    rentalCount: tray._count ? tray._count.rentalTrays : undefined,
    createdAt: tray.createdAt,
    updatedAt: tray.updatedAt,
  };
}

async function getTrayOrThrow(id) {
  const tray = await repo.findById(id);
  if (!tray) throw fail(404, ERROR_CODES.NOT_FOUND, 'Không tìm thấy khay');
  return tray;
}

async function listTrays({ page, pageSize, filters }) {
  const where = {};
  if (filters.roomId) where.roomId = filters.roomId;
  if (filters.occupancyStatus) where.occupancyStatus = filters.occupancyStatus;
  if (filters.trayCode) where.trayCode = { contains: filters.trayCode, mode: 'insensitive' };

  const { items, total } = await repo.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    items: items.map(toDto),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

async function createTray(data) {
  try {
    return toDto(await repo.create(data));
  } catch (err) {
    if (err.code === 'P2002') {
      throw fail(409, ERROR_CODES.CONFLICT, 'Mã khay hoặc vị trí trong phòng đã tồn tại');
    }
    if (err.code === 'P2003') {
      throw fail(404, ERROR_CODES.NOT_FOUND, 'Không tìm thấy phòng');
    }
    throw err;
  }
}

async function getTray(id) {
  return toDto(await getTrayOrThrow(id));
}

async function updateTray(id, data) {
  await getTrayOrThrow(id);
  try {
    return toDto(await repo.update(id, data));
  } catch (err) {
    if (err.code === 'P2002') {
      throw fail(409, ERROR_CODES.CONFLICT, 'Mã khay hoặc vị trí trong phòng đã tồn tại');
    }
    if (err.code === 'P2003') {
      throw fail(404, ERROR_CODES.NOT_FOUND, 'Không tìm thấy phòng');
    }
    if (err.code === 'P2025') {
      throw fail(404, ERROR_CODES.NOT_FOUND, 'Không tìm thấy khay');
    }
    throw err;
  }
}

async function deleteTray(id) {
  const tray = await getTrayOrThrow(id);
  if (tray._count.rentalTrays > 0) {
    throw fail(409, ERROR_CODES.INVALID_STATE, 'Không thể xóa khay đã từng thuộc đơn thuê');
  }

  try {
    await repo.remove(id);
  } catch (err) {
    if (err.code === 'P2003') {
      throw fail(409, ERROR_CODES.INVALID_STATE, 'Không thể xóa khay đã từng thuộc đơn thuê');
    }
    if (err.code === 'P2025') {
      throw fail(404, ERROR_CODES.NOT_FOUND, 'Không tìm thấy khay');
    }
    throw err;
  }
}

async function completeCleaning(id) {
  const tray = await getTrayOrThrow(id);
  if (tray.occupancyStatus !== 'CLEANING') {
    throw fail(
      409,
      ERROR_CODES.INVALID_STATE,
      'Chỉ khay ở trạng thái CLEANING mới được hoàn tất vệ sinh',
    );
  }

  return toDto(await repo.update(id, { occupancyStatus: 'AVAILABLE' }));
}

module.exports = {
  listTrays,
  createTray,
  getTray,
  updateTray,
  deleteTray,
  completeCleaning,
};
