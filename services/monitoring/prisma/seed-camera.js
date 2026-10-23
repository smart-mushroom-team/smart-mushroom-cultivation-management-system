const { PrismaClient } = require('../generated/prisma');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding camera device...');

  const plainTextApiKey = 'test-device-key-camera';
  const apiKeyHash = crypto.createHash('sha256').update(plainTextApiKey).digest('hex');

  const camera = await prisma.device.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      roomId: '00000000-0000-0000-0000-000000000101',
      type: 'CAMERA',
      name: 'Camera Agent Room 1',
      apiKeyHash,
      status: 'ACTIVE',
      connectionState: 'OFFLINE',
      intervalSec: 60,
    },
  });

  console.log('✅ Created camera device:', camera.id);
  console.log('📝 Device ID:', camera.id);
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
