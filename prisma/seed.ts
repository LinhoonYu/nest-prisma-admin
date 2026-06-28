import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const username = 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { username_deletedId: { username, deletedId: 0n } },
    update: {},
    create: {
      username,
      nickname: '超级管理员',
      isSuperAdmin: true,
      status: 1,
      dataScope: 1,
    },
  });

  await prisma.userCredential.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      passwordHash,
      passwordAlgo: 'bcrypt',
    },
  });

  console.log(`Seed completed: admin user created (id=${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
