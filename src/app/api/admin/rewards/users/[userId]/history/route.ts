import { prisma } from '@/lib/prisma';
import {
  ApiErrors,
  apiSuccess,
  requireAdmin,
  requireAuth,
} from '@/lib/api-utils';
import { serializeUserStreak } from '@/lib/rewards/streaks';

function parseLimit(searchParams: URLSearchParams): number {
  const rawLimit = searchParams.get('limit');
  if (!rawLimit) return 24;

  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed) || parsed <= 0) return 24;
  return Math.min(Math.floor(parsed), 104);
}

function parseOptionalDate(
  searchParams: URLSearchParams,
  key: string
): Date | null | 'invalid' {
  const rawValue = searchParams.get(key);
  if (!rawValue) return null;

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return 'invalid';
  }

  return parsed;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function buildSnapshotWhere(params: {
  userId: string;
  startWeekDate: Date | null;
  endWeekDate: Date | null;
}): Record<string, unknown> {
  const where: Record<string, unknown> = {
    userId: params.userId,
  };

  if (params.startWeekDate || params.endWeekDate) {
    where.weekStartDate = {
      ...(params.startWeekDate ? { gte: startOfUtcDay(params.startWeekDate) } : {}),
      ...(params.endWeekDate ? { lte: startOfUtcDay(params.endWeekDate) } : {}),
    };
  }

  return where;
}

// GET /api/admin/rewards/users/:userId/history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { userId: rawUserId } = await params;
    const userId = rawUserId?.trim();
    if (!userId) {
      return ApiErrors.validation('User id is required');
    }

    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams);
    const startWeekDate = parseOptionalDate(searchParams, 'startWeekDate');
    const endWeekDate = parseOptionalDate(searchParams, 'endWeekDate');

    if (startWeekDate === 'invalid' || endWeekDate === 'invalid') {
      return ApiErrors.validation('Invalid week date filter');
    }
    if (startWeekDate && endWeekDate && startWeekDate.getTime() > endWeekDate.getTime()) {
      return ApiErrors.validation('startWeekDate must be on or before endWeekDate');
    }

    const snapshotWhere = buildSnapshotWhere({
      userId,
      startWeekDate,
      endWeekDate,
    });

    const [user, totalSnapshots, snapshots, activeStreaks] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          seniority: true,
          image: true,
        },
      }),
      prisma.weeklySnapshot.count({
        where: snapshotWhere,
      }),
      prisma.weeklySnapshot.findMany({
        where: snapshotWhere,
        orderBy: [{ weekStartDate: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        select: {
          id: true,
          weekStartDate: true,
          weekEndDate: true,
          seniorityAtSnapshot: true,
          storyPointsCompleted: true,
          cardsCompleted: true,
          avgQualityScore: true,
          avgTechnicalQuality: true,
          avgArtDirection: true,
          avgContextFit: true,
          avgDelivery: true,
          scoredCardCount: true,
          firstPassCount: true,
          firstPassRate: true,
          avgReviewCycles: true,
          evaluationsSubmitted: true,
          evaluationEligible: true,
          evaluationRate: true,
          createdAt: true,
          badgeAwards: {
            orderBy: [{ awardedAt: 'desc' }, { id: 'desc' }],
            select: {
              id: true,
              awardedAt: true,
              metadata: true,
              badgeDefinition: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  description: true,
                  category: true,
                  tier: true,
                },
              },
            },
          },
        },
      }),
      prisma.userStreak.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: [{ currentCount: 'desc' }, { longestCount: 'desc' }, { streakType: 'asc' }],
        select: {
          id: true,
          streakType: true,
          currentCount: true,
          longestCount: true,
          lastQualifiedWeek: true,
          graceUsed: true,
          isActive: true,
        },
      }),
    ]);

    if (!user) {
      return ApiErrors.notFound('User not found');
    }

    const qualitySnapshots = snapshots.filter((snapshot) => snapshot.avgQualityScore !== null);
    const averagePoints = snapshots.length > 0
      ? snapshots.reduce((sum, snapshot) => sum + snapshot.storyPointsCompleted, 0) / snapshots.length
      : null;
    const averageQuality = qualitySnapshots.length > 0
      ? qualitySnapshots.reduce((sum, snapshot) => sum + (snapshot.avgQualityScore ?? 0), 0) / qualitySnapshots.length
      : null;

    return apiSuccess({
      user,
      filters: {
        startWeekDate: startWeekDate ? startOfUtcDay(startWeekDate).toISOString().slice(0, 10) : null,
        endWeekDate: endWeekDate ? startOfUtcDay(endWeekDate).toISOString().slice(0, 10) : null,
        limit,
      },
      summary: {
        totalSnapshots,
        returnedSnapshots: snapshots.length,
        averagePointsPerSnapshot: averagePoints,
        averageQualityScore: averageQuality,
        firstSnapshotWeek: snapshots.length > 0
          ? snapshots[snapshots.length - 1].weekStartDate.toISOString().slice(0, 10)
          : null,
        latestSnapshotWeek: snapshots.length > 0
          ? snapshots[0].weekStartDate.toISOString().slice(0, 10)
          : null,
      },
      activeStreaks: activeStreaks.map(serializeUserStreak),
      snapshots: snapshots.map((snapshot) => ({
        id: snapshot.id,
        weekStartDate: snapshot.weekStartDate.toISOString().slice(0, 10),
        weekEndDate: snapshot.weekEndDate.toISOString().slice(0, 10),
        seniorityAtSnapshot: snapshot.seniorityAtSnapshot,
        storyPointsCompleted: snapshot.storyPointsCompleted,
        cardsCompleted: snapshot.cardsCompleted,
        avgQualityScore: snapshot.avgQualityScore,
        avgTechnicalQuality: snapshot.avgTechnicalQuality,
        avgArtDirection: snapshot.avgArtDirection,
        avgContextFit: snapshot.avgContextFit,
        avgDelivery: snapshot.avgDelivery,
        scoredCardCount: snapshot.scoredCardCount,
        firstPassCount: snapshot.firstPassCount,
        firstPassRate: snapshot.firstPassRate,
        avgReviewCycles: snapshot.avgReviewCycles,
        evaluationsSubmitted: snapshot.evaluationsSubmitted,
        evaluationEligible: snapshot.evaluationEligible,
        evaluationRate: snapshot.evaluationRate,
        createdAt: snapshot.createdAt.toISOString(),
        badgeAwards: snapshot.badgeAwards.map((award) => ({
          id: award.id,
          awardedAt: award.awardedAt.toISOString(),
          metadata: award.metadata,
          badge: {
            id: award.badgeDefinition.id,
            slug: award.badgeDefinition.slug,
            name: award.badgeDefinition.name,
            description: award.badgeDefinition.description,
            category: award.badgeDefinition.category,
            tier: award.badgeDefinition.tier,
          },
        })),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch rewards user history:', error);
    return ApiErrors.internal('Failed to fetch rewards user history');
  }
}
