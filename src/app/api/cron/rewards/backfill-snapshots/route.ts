import { prisma } from '@/lib/prisma';
import { apiError, ApiErrors, apiSuccess } from '@/lib/api-utils';
import {
  addDays,
  buildWeeklySnapshots,
  resolveSnapshotWeekRange,
  toWeekStartDate,
} from '@/lib/rewards/snapshot-builder';
import { evaluateWeeklyBadges } from '@/lib/rewards/weekly-badges';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get('authorization');
  const tokenFromAuth = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;
  const tokenFromHeader = request.headers.get('x-cron-secret');

  return tokenFromAuth === secret || tokenFromHeader === secret;
}

async function discoverEarliestRewardsWeek(): Promise<Date | null> {
  const [earliestCompletedCard, earliestEvaluation, earliestOpenedCycle, earliestSnapshot] =
    await Promise.all([
      prisma.card.findFirst({
        where: { completedAt: { not: null } },
        orderBy: { completedAt: 'asc' },
        select: { completedAt: true },
      }),
      prisma.evaluation.findFirst({
        orderBy: { submittedAt: 'asc' },
        select: { submittedAt: true },
      }),
      prisma.reviewCycle.findFirst({
        orderBy: { openedAt: 'asc' },
        select: { openedAt: true },
      }),
      prisma.weeklySnapshot.findFirst({
        orderBy: { weekStartDate: 'asc' },
        select: { weekStartDate: true },
      }),
    ]);

  const candidates = [
    earliestCompletedCard?.completedAt ?? null,
    earliestEvaluation?.submittedAt ?? null,
    earliestOpenedCycle?.openedAt ?? null,
    earliestSnapshot?.weekStartDate ?? null,
  ].filter((value): value is Date => value instanceof Date);

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => a.getTime() - b.getTime());
  return toWeekStartDate(candidates[0]);
}

function parseUserIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const userIds = value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  return userIds.length > 0 ? userIds : undefined;
}

async function handleCronRequest(request: Request) {
  if (!process.env.CRON_SECRET) {
    return ApiErrors.internal('CRON_SECRET environment variable is not configured');
  }

  if (!isAuthorized(request)) {
    return apiError('UNAUTHORIZED', 'Invalid cron secret', 401);
  }

  try {
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
    const rawStartWeekDate =
      body && typeof body.startWeekDate === 'string' ? new Date(body.startWeekDate) : undefined;
    const rawEndWeekDate =
      body && typeof body.endWeekDate === 'string' ? new Date(body.endWeekDate) : undefined;
    const userIds = body && typeof body === 'object' && !Array.isArray(body)
      ? parseUserIds((body as Record<string, unknown>).userIds)
      : undefined;

    if (rawStartWeekDate && Number.isNaN(rawStartWeekDate.getTime())) {
      return ApiErrors.validation('Invalid startWeekDate');
    }

    if (rawEndWeekDate && Number.isNaN(rawEndWeekDate.getTime())) {
      return ApiErrors.validation('Invalid endWeekDate');
    }

    const discoveredStartWeek = rawStartWeekDate ?? await discoverEarliestRewardsWeek();
    if (!discoveredStartWeek) {
      return apiSuccess({
        weeksProcessed: 0,
        message: 'No reward-eligible historical data found',
      });
    }

    const defaultEndWeek = resolveSnapshotWeekRange().weekStartDate;
    const startWeekDate = toWeekStartDate(discoveredStartWeek);
    const endWeekDate = toWeekStartDate(rawEndWeekDate ?? defaultEndWeek);

    if (startWeekDate.getTime() > endWeekDate.getTime()) {
      return ApiErrors.validation('startWeekDate must be on or before endWeekDate');
    }

    const weeks = [];
    for (
      let currentWeekDate = new Date(startWeekDate);
      currentWeekDate.getTime() <= endWeekDate.getTime();
      currentWeekDate = addDays(currentWeekDate, 7)
    ) {
      const snapshotResult = await buildWeeklySnapshots(prisma, {
        weekStartDate: currentWeekDate,
        userIds,
      });
      const badgeResult = await evaluateWeeklyBadges(prisma, {
        weekStartDate: snapshotResult.weekStartDate,
        userIds,
      });

      weeks.push({
        weekStartDate: snapshotResult.weekStartDate.toISOString(),
        weekEndDate: snapshotResult.weekEndDate.toISOString(),
        createdSnapshots: snapshotResult.createdCount,
        skippedExistingSnapshots: snapshotResult.skippedExistingCount,
        warnings: snapshotResult.warnings,
        usersEvaluated: badgeResult.usersEvaluated,
        awardsCreated: badgeResult.awardsCreated,
        streaksUpdated: badgeResult.streaksUpdated,
        createdByCategory: badgeResult.createdByCategory,
      });
    }

    return apiSuccess({
      startWeekDate: startWeekDate.toISOString(),
      endWeekDate: endWeekDate.toISOString(),
      weeksProcessed: weeks.length,
      userIds: userIds ?? null,
      weeks,
    });
  } catch (error) {
    console.error('Rewards snapshot backfill failed:', error);
    return ApiErrors.internal('Failed to backfill rewards snapshots');
  }
}

export async function GET(request: Request) {
  return handleCronRequest(request);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}
