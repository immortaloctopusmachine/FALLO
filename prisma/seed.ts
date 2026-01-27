import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test user
  const passwordHash = await hash('password123', 12);

  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Created test user:', testUser.email);

  // Create a sample board
  const board = await prisma.board.upsert({
    where: { id: 'sample-board-1' },
    update: {},
    create: {
      id: 'sample-board-1',
      name: 'Sample Project',
      description: 'A sample board to get started',
      settings: {},
    },
  });

  console.log('Created sample board:', board.name);

  // Add user as board member
  await prisma.boardMember.upsert({
    where: {
      userId_boardId: {
        userId: testUser.id,
        boardId: board.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      boardId: board.id,
      role: 'ADMIN',
    },
  });

  console.log('Added user to board as ADMIN');

  // Create sample lists
  const lists = ['To Do', 'In Progress', 'Review', 'Done'];

  for (let i = 0; i < lists.length; i++) {
    await prisma.list.upsert({
      where: { id: `sample-list-${i + 1}` },
      update: {},
      create: {
        id: `sample-list-${i + 1}`,
        name: lists[i],
        position: i,
        boardId: board.id,
      },
    });
  }

  console.log('Created sample lists:', lists.join(', '));

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
