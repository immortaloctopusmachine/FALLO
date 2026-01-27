import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'test@example.com';
  const password = 'password123';

  console.log('Testing login with:', { email, password });

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  console.log('User found:', { id: user.id, email: user.email });
  console.log('Password hash exists:', !!user.passwordHash);

  if (user.passwordHash) {
    const isValid = await compare(password, user.passwordHash);
    console.log('Password valid:', isValid);
  }

  await prisma.$disconnect();
}

main();
