'use strict';

/**
 * PrismaClient được tạo lười (lazy) để service vẫn khởi động được khi chưa chạy `prisma generate`
 * (ví dụ lúc chạy test). Client được sinh vào ../../generated/prisma (xem prisma/schema.prisma).
 *
 * Với "Prisma + raw SQL": dùng prisma.$queryRaw`...` / prisma.$executeRaw`...` / prisma.$transaction(...)
 * cho các truy vấn cần khóa dòng (SELECT ... FOR UPDATE), cập nhật có điều kiện, upsert phức tạp.
 */
let client;

function getPrisma() {
  if (!client) {
    const { PrismaClient } = require('../../generated/prisma');
    client = new PrismaClient();
  }
  return client;
}

async function disconnectPrisma() {
  if (client) await client.$disconnect();
}

module.exports = { getPrisma, disconnectPrisma };
