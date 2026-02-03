import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      permission: true,
    },
  });

  console.log('Users in database:');
  users.forEach((u) => {
    console.log({
      ...u,
      passwordHash: u.passwordHash ? `[${u.passwordHash.length} chars]` : '[MISSING]',
    });
  });

  await prisma.$disconnect();
}

main();
