'use strict';

/**
 * FR-01: tạo sẵn tài khoản Administrator đầu tiên (idempotent: chạy lại không ghi đè).
 * Chạy sau khi đã có migration:  npm run db:seed -w services/identity
 * Đọc SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME từ biến môi trường.
 */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../generated/prisma');

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase(); // DB bắt buộc email chữ thường
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Administrator';
  if (!email || !password) {
    throw new Error('Cần đặt SEED_ADMIN_EMAIL và SEED_ADMIN_PASSWORD');
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.user.upsert({
      where: { email },
      update: {}, // đã tồn tại thì giữ nguyên
      create: { email, name, passwordHash, role: 'ADMIN', status: 'ACTIVE' },
    });
    console.log(`Admin sẵn sàng: ${admin.email} (id=${admin.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
