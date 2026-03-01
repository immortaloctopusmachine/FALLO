import { prisma } from '@/lib/prisma';
import { apiError, ApiErrors, apiSuccess } from '@/lib/api-utils';
import { buildWeeklySnapshots } from '@/lib/rewards/snapshot-builder';
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

async function handleCronRequest(request: Request) {
  if (!process.env.CRON_SECRET) {
    return ApiErrors.internal('CRON_SECRET environment variable is not configured');
  }

  if (!isAuthorized(request)) {
    return apiError('UNAUTHORIZED', 'Invalid cron secret', 401);
  }

  try {
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
    const weekStartDate =
      body && typeof body.weekStartDate === 'string' ? new Date(body.weekStartDate) : undefined;

    if (weekStartDate && Number.isNaN(weekStartDate.getTime())) {
      return ApiErrors.validation('Invalid weekStartDate');
    }

    const snapshotResult = await buildWeeklySnapshots(prisma, {
      weekStartDate,
    });
    const badgeResult = await evaluateWeeklyBadges(prisma, {
      weekStartDate: snapshotResult.weekStartDate,
    });

    return apiSuccess({
      weekStartDate: snapshotResult.weekStartDate.toISOString(),
      weekEndDate: snapshotResult.weekEndDate.toISOString(),
      createdCount: snapshotResult.createdCount,
      skippedExistingCount: snapshotResult.skippedExistingCount,
      warnings: snapshotResult.warnings,
      badges: {
        usersEvaluated: badgeResult.usersEvaluated,
        awardsCreated: badgeResult.awardsCreated,
        streaksUpdated: badgeResult.streaksUpdated,
        createdByCategory: badgeResult.createdByCategory,
      },
    });
  } catch (error) {
    console.error('Rewards weekly snapshot cron failed:', error);
    return ApiErrors.internal('Failed to build weekly snapshots');
  }
}

export async function GET(request: Request) {
  return handleCronRequest(request);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}
