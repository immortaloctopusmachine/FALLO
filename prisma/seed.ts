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

  // Seed default skills (global - no studioId)
  const defaultSkills = [
    { name: 'Math/Mechanics', description: 'Game mathematics and mechanics design', color: '#6366f1' },
    { name: 'Spine Animation', description: 'Spine 2D animation creation', color: '#8b5cf6' },
    { name: 'Concept Art', description: 'Initial visual concepts and ideation', color: '#a855f7' },
    { name: 'Production Art', description: 'Final production-ready artwork', color: '#d946ef' },
    { name: 'QA Testing', description: 'Quality assurance and testing', color: '#ec4899' },
    { name: 'Sound Design', description: 'Sound effects and audio design', color: '#f43f5e' },
    { name: 'Music Composition', description: 'Original music and composition', color: '#ef4444' },
    { name: 'Project Management', description: 'Project coordination and management', color: '#f97316' },
    { name: 'Marketing', description: 'Marketing materials and campaigns', color: '#eab308' },
    { name: 'Development', description: 'Software development and integration', color: '#22c55e' },
  ];

  for (let i = 0; i < defaultSkills.length; i++) {
    const skill = defaultSkills[i];
    await prisma.skill.upsert({
      where: { id: `default-skill-${i + 1}` },
      update: { ...skill, position: i },
      create: {
        id: `default-skill-${i + 1}`,
        ...skill,
        position: i,
        studioId: null, // Global skill
      },
    });
  }

  console.log('Created default skills:', defaultSkills.map(s => s.name).join(', '));

  // Seed default block types (global - no studioId)
  const defaultBlockTypes = [
    { name: 'Spine Prototype', color: '#8b5cf6', description: 'Initial animation prototype phase' },
    { name: 'Concept', color: '#3b82f6', description: 'Concept art and ideation phase' },
    { name: 'Production', color: '#22c55e', description: 'Main production work phase' },
    { name: 'Tweak', color: '#f97316', description: 'Fine-tuning and adjustments phase' },
    { name: 'QA', color: '#ec4899', description: 'Quality assurance testing phase' },
    { name: 'Marketing', color: '#eab308', description: 'Marketing preparation phase' },
  ];

  for (let i = 0; i < defaultBlockTypes.length; i++) {
    const blockType = defaultBlockTypes[i];
    await prisma.blockType.upsert({
      where: { id: `default-block-type-${i + 1}` },
      update: { ...blockType, position: i, isDefault: true },
      create: {
        id: `default-block-type-${i + 1}`,
        ...blockType,
        position: i,
        isDefault: true,
        studioId: null, // Global block type
      },
    });
  }

  console.log('Created default block types:', defaultBlockTypes.map(b => b.name).join(', '));

  // Seed default event types (global - no studioId)
  const defaultEventTypes = [
    { name: 'GSD', color: '#3b82f6', icon: 'file-text', description: 'Game Specification Document milestone' },
    { name: 'Marketing Deadline', color: '#eab308', icon: 'megaphone', description: 'Marketing material due date' },
    { name: 'Review', color: '#8b5cf6', icon: 'eye', description: 'Review meeting or checkpoint' },
    { name: 'Demo', color: '#22c55e', icon: 'play', description: 'Demo presentation' },
    { name: 'Send To', color: '#06b6d4', icon: 'send', description: 'Delivery to external party' },
    { name: 'Vacation', color: '#f97316', icon: 'palm-tree', description: 'Team member vacation' },
    { name: 'Greenlight', color: '#10b981', icon: 'check-circle', description: 'Project approval milestone' },
    { name: 'Music Start', color: '#ec4899', icon: 'music', description: 'Music production begins' },
    { name: 'SFX Start', color: '#f43f5e', icon: 'volume-2', description: 'Sound effects production begins' },
    { name: 'Game Name', color: '#a855f7', icon: 'tag', description: 'Game naming finalized' },
    { name: 'Release', color: '#ef4444', icon: 'rocket', description: 'Game release milestone' },
    { name: 'Server', color: '#6366f1', icon: 'server', description: 'Server-side deployment' },
    { name: 'Client', color: '#14b8a6', icon: 'monitor', description: 'Client-side deployment' },
  ];

  for (let i = 0; i < defaultEventTypes.length; i++) {
    const eventType = defaultEventTypes[i];
    await prisma.eventType.upsert({
      where: { id: `default-event-type-${i + 1}` },
      update: { ...eventType, position: i, isDefault: true },
      create: {
        id: `default-event-type-${i + 1}`,
        ...eventType,
        position: i,
        isDefault: true,
        studioId: null, // Global event type
      },
    });
  }

  console.log('Created default event types:', defaultEventTypes.map(e => e.name).join(', '));

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
