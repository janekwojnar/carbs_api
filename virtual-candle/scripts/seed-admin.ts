import { hash } from 'bcryptjs';

import { prisma } from '../lib/prisma';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }

  const passwordHash = await hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: 'Admin',
      passwordHash,
      role: 'ADMIN'
    },
    update: {
      passwordHash,
      role: 'ADMIN'
    }
  });

  console.log('Admin user seeded');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
