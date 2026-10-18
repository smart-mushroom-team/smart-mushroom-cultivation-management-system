const prisma = require('../config/prisma').getPrisma();

const trayInclude = {
  _count: { select: { rentalTrays: true } },
};

function findMany({ where, skip, take }) {
  return prisma
    .$transaction([
      prisma.tray.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: trayInclude,
      }),
      prisma.tray.count({ where }),
    ])
    .then(([items, total]) => ({ items, total }));
}

function findById(id) {
  return prisma.tray.findUnique({ where: { id }, include: trayInclude });
}

function create(data) {
  return prisma.tray.create({ data, include: trayInclude });
}

function update(id, data) {
  return prisma.tray.update({ where: { id }, data, include: trayInclude });
}

function remove(id) {
  return prisma.tray.delete({ where: { id } });
}

module.exports = { findMany, findById, create, update, remove };
