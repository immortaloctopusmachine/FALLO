import { PrismaClient } from '@prisma/client';
import { MVP_BADGE_DEFINITIONS } from '../src/lib/rewards/badge-seed-data';
import { DEFAULT_SENIORITY_CONFIGS } from '../src/lib/rewards/seniority';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rewards runtime data...');

  for (const config of DEFAULT_SENIORITY_CONFIGS) {
    await prisma.seniorityConfig.upsert({
      where: { seniority: config.seniority },
      update: config,
      create: config,
    });
  }

  console.log('Upserted default seniority configs');

  for (const definition of MVP_BADGE_DEFINITIONS) {
    await prisma.badgeDefinition.upsert({
      where: { slug: definition.slug },
      update: {
        name: definition.name,
        description: definition.description,
        category: definition.category,
        tier: definition.tier ?? null,
        iconUrl: definition.iconUrl ?? null,
        isActive: true,
        conditions: definition.conditions,
      },
      create: {
        slug: definition.slug,
        name: definition.name,
        description: definition.description,
        category: definition.category,
        tier: definition.tier ?? null,
        iconUrl: definition.iconUrl ?? null,
        isActive: true,
        conditions: definition.conditions,
      },
    });
  }

  console.log(`Upserted MVP badge definitions: ${MVP_BADGE_DEFINITIONS.length}`);
  console.log('Rewards runtime seed completed');
}

main()
  .catch((error) => {
    console.error('Error seeding rewards runtime data:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
