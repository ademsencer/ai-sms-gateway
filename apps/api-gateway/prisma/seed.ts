import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Seed test device
  const testApiKey = 'test-device-key-001';
  const apiKeyHash = await bcrypt.hash(testApiKey, 10);

  await prisma.device.upsert({
    where: { deviceId: 'device_001' },
    update: {},
    create: {
      deviceId: 'device_001',
      name: 'Test Android Device',
      apiKeyHash,
      status: 'online',
    },
  });

  console.log('Test device: device_001');
  console.log(`Test API key: ${testApiKey}`);

  // Seed admin user
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      passwordHash,
      role: 'admin',
    },
  });

  console.log(`Admin user: ${adminUsername}`);
  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
