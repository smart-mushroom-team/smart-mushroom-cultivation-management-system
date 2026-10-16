const prisma = require('../config/prisma').getPrisma();

// Tầng repository: chỉ nói chuyện với DB, không chứa luật nghiệp vụ.

const roomWithTrayCount = {
  _count: { select: { trays: true } },
};

function create(data) {
  return prisma.room.create({ data, include: roomWithTrayCount });
}

function findById(id) {
  return prisma.room.findUnique({ where: { id }, include: roomWithTrayCount });
}

// Tìm phòng trùng tên (không phân biệt hoa/thường). excludeId dùng khi sửa.
function findByName(name, excludeId) {
  return prisma.room.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
}

async function findMany({ where, skip, take }) {
  const [items, total] = await prisma.$transaction([
    prisma.room.findMany({
      where,
      skip,
      take,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      include: roomWithTrayCount,
    }),
    prisma.room.count({ where }),
  ]);
  return { items, total };
}

function update(id, data) {
  return prisma.room.update({
    where: { id },
    data,
    include: roomWithTrayCount,
  });
}

// Thống kê khay theo trạng thái sử dụng: { AVAILABLE: n, RESERVED: n, ... }
async function getTrayStats(roomId) {
  const rows = await prisma.tray.groupBy({
    by: ['occupancyStatus'],
    where: { roomId },
    _count: { _all: true },
  });
  const stats = { AVAILABLE: 0, RESERVED: 0, RENTED: 0, CLEANING: 0 };
  for (const row of rows) stats[row.occupancyStatus] = row._count._all;
  return stats;
}

// Số khay đang bị giữ chỗ / đang cho thuê trong phòng.
function countInUseTrays(roomId) {
  return prisma.tray.count({
    where: { roomId, occupancyStatus: { in: ['RESERVED', 'RENTED'] } },
  });
}

module.exports = {
  create,
  findById,
  findByName,
  findMany,
  update,
  getTrayStats,
  countInUseTrays,
};
