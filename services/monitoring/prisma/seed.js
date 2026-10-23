const { PrismaClient } = require('../generated/prisma');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Tạo API key cho device test
  const plainTextApiKey = 'test-device-key';
  const apiKeyHash = crypto.createHash('sha256').update(plainTextApiKey).digest('hex');

  // Tạo sensor device
  const sensor = await prisma.device.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      roomId: '00000000-0000-0000-0000-000000000101', // UUID format
      type: 'SENSOR',
      name: 'ESP32 Simulator Room 1',
      apiKeyHash,
      status: 'ACTIVE',
      connectionState: 'OFFLINE',
      intervalSec: 30,
    },
  });

  console.log('✅ Created sensor device:', sensor.id);
  console.log('📝 Device ID:', sensor.id);
  console.log('🔑 API Key:', plainTextApiKey);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
