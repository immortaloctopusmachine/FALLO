import { PrismaClient } from '@prisma/client';
import { addDays, toWeekStartDate } from '../src/lib/rewards/snapshot-builder';
import { buildWeeklySnapshots } from '../src/lib/rewards/snapshot-builder';
import { evaluateWeeklyBadges } from '../src/lib/rewards/weekly-badges';

const prisma = new PrismaClient();

function parseOptionalDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function main() {
  const rawStart = process.argv[2];
  const rawEnd = process.argv[3];

  if (!rawStart || !rawEnd) {
    console.error('Usage: npx tsx scripts/run-rewards-backfill-slice.ts <startWeekDate> <endWeekDate>');
    process.exit(1);
  }

  const parsedStart = parseOptionalDate(rawStart);
  const parsedEnd = parseOptionalDate(rawEnd);

  if (!parsedStart || !parsedEnd) {
    console.error('Invalid date. Use YYYY-MM-DD values.');
    process.exit(1);
  }

  const startWeekDate = toWeekStartDate(parsedStart);
  const endWeekDate = toWeekStartDate(parsedEnd);

  if (startWeekDate.getTime() > endWeekDate.getTime()) {
    console.error('startWeekDate must be on or before endWeekDate');
    process.exit(1);
  }

  const results = [];

  for (
    let weekStartDate = new Date(startWeekDate);
    weekStartDate.getTime() <= endWeekDate.getTime();
    weekStartDate = addDays(weekStartDate, 7)
  ) {
    const snapshotResult = await buildWeeklySnapshots(prisma, { weekStartDate });
    const badgeResult = await evaluateWeeklyBadges(prisma, {
      weekStartDate: snapshotResult.weekStartDate,
    });

    results.push({
      weekStartDate: snapshotResult.weekStartDate.toISOString().slice(0, 10),
      weekEndDate: snapshotResult.weekEndDate.toISOString().slice(0, 10),
      createdSnapshots: snapshotResult.createdCount,
      skippedExistingSnapshots: snapshotResult.skippedExistingCount,
      warnings: snapshotResult.warnings,
      usersEvaluated: badgeResult.usersEvaluated,
      awardsCreated: badgeResult.awardsCreated,
      streaksUpdated: badgeResult.streaksUpdated,
      createdByCategory: badgeResult.createdByCategory,
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((error) => {
    console.error('Rewards slice backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
