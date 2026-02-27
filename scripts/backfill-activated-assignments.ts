import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting backfill of activatedAt for existing assignments...');

  // Find all CardUser records where:
  // - activatedAt is null (not yet set)
  // - Card is in a TASKS list (not PLANNING)
  const result = await prisma.$executeRaw`
    UPDATE card_users cu
    SET "activatedAt" = cu."assignedAt"
    FROM cards c
    JOIN lists l ON c."listId" = l.id
    WHERE cu."cardId" = c.id
      AND cu."activatedAt" IS NULL
      AND l."viewType" = 'TASKS'
  `;

  console.log(`✅ Backfilled ${result} assignments in Task lists`);

  // Also handle cards that don't have a viewType set (older boards)
  const legacyResult = await prisma.$executeRaw`
    UPDATE card_users cu
    SET "activatedAt" = cu."assignedAt"
    FROM cards c
    JOIN lists l ON c."listId" = l.id
    WHERE cu."cardId" = c.id
      AND cu."activatedAt" IS NULL
      AND l."viewType" IS NULL
  `;

  console.log(`✅ Backfilled ${legacyResult} assignments in lists without viewType (legacy)`);

  console.log('Backfill complete!');
}

main()
  .catch((error) => {
    console.error('Error during backfill:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
