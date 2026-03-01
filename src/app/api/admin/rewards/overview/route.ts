import { prisma } from '@/lib/prisma';
import {
  ApiErrors,
  apiSuccess,
  requireAdmin,
  requireAuth,
} from '@/lib/api-utils';
import { describeStreakType, serializeUserStreak } from '@/lib/rewards/streaks';

function parseLimit(searchParams: URLSearchParams): number {
  const rawLimit = searchParams.get('limit');
  if (!rawLimit) return 12;

  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed) || parsed <= 0) return 12;
  return Math.min(Math.floor(parsed), 50);
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

function endOfUtcDay(date: Date): Date {
  const end = startOfUtcDay(date);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);
  return end;
}

function buildSnapshotWhere(params: {
  userId: string | null;
  startWeekDate: Date | null;
  endWeekDate: Date | null;
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (params.userId) where.userId = params.userId;

  if (params.startWeekDate || params.endWeekDate) {
    where.weekStartDate = {
      ...(params.startWeekDate ? { gte: startOfUtcDay(params.startWeekDate) } : {}),
      ...(params.endWeekDate ? { lte: startOfUtcDay(params.endWeekDate) } : {}),
    };
  }

  return where;
}

function buildAwardWhere(params: {
  userId: string | null;
  startWeekDate: Date | null;
  endWeekDate: Date | null;
  badgeCategory: string | null;
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (params.userId) where.userId = params.userId;
  if (params.badgeCategory) {
    where.badgeDefinition = {
      category: params.badgeCategory,
    };
  }

  if (params.startWeekDate || params.endWeekDate) {
    const rangeStart = params.startWeekDate ? startOfUtcDay(params.startWeekDate) : null;
    const rangeEnd = params.endWeekDate ? endOfUtcDay(params.endWeekDate) : null;

    where.OR = [
      {
        triggerSnapshot: {
          weekStartDate: {
            ...(rangeStart ? { gte: rangeStart } : {}),
            ...(rangeEnd ? { lte: startOfUtcDay(params.endWeekDate!) } : {}),
          },
        },
      },
      {
        triggerSnapshotId: null,
        awardedAt: {
          ...(rangeStart ? { gte: rangeStart } : {}),
          ...(rangeEnd ? { lte: rangeEnd } : {}),
        },
      },
    ];
  }

  return where;
}

function buildActiveStreakWhere(params: {
  userId: string | null;
  startWeekDate: Date | null;
  endWeekDate: Date | null;
  streakType: string | null;
}): Record<string, unknown> {
  const where: Record<string, unknown> = { isActive: true };
  if (params.userId) where.userId = params.userId;
  if (params.streakType) where.streakType = params.streakType;

  if (params.startWeekDate || params.endWeekDate) {
    where.lastQualifiedWeek = {
      ...(params.startWeekDate ? { gte: startOfUtcDay(params.startWeekDate) } : {}),
      ...(params.endWeekDate ? { lte: startOfUtcDay(params.endWeekDate) } : {}),
    };
  }

  return where;
}

function parseFilters(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams);
  const userId = searchParams.get('userId');
  const badgeCategory = searchParams.get('badgeCategory');
  const streakType = searchParams.get('streakType');
  const startWeekDate = parseOptionalDate(searchParams, 'startWeekDate');
  const endWeekDate = parseOptionalDate(searchParams, 'endWeekDate');

  return {
    limit,
    userId: userId && userId.trim().length > 0 ? userId : null,
    badgeCategory: badgeCategory && badgeCategory.trim().length > 0 ? badgeCategory : null,
    streakType: streakType && streakType.trim().length > 0 ? streakType : null,
    startWeekDate,
    endWeekDate,
  };
}

// GET /api/admin/rewards/overview
export async function GET(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const filters = parseFilters(request);
    if (filters.startWeekDate === 'invalid' || filters.endWeekDate === 'invalid') {
      return ApiErrors.validation('Invalid week date filter');
    }
    if (
      filters.startWeekDate
      && filters.endWeekDate
      && filters.startWeekDate.getTime() > filters.endWeekDate.getTime()
    ) {
      return ApiErrors.validation('startWeekDate must be on or before endWeekDate');
    }

    const snapshotWhere = buildSnapshotWhere({
      userId: filters.userId,
      startWeekDate: filters.startWeekDate,
      endWeekDate: filters.endWeekDate,
    });
    const awardWhere = buildAwardWhere({
      userId: filters.userId,
      startWeekDate: filters.startWeekDate,
      endWeekDate: filters.endWeekDate,
      badgeCategory: filters.badgeCategory,
    });
    const activeStreakWhere = buildActiveStreakWhere({
      userId: filters.userId,
      startWeekDate: filters.startWeekDate,
      endWeekDate: filters.endWeekDate,
      streakType: filters.streakType,
    });
    const hasSnapshotFilters = Boolean(
      filters.userId || filters.startWeekDate || filters.endWeekDate
    );
    const hasAwardFilters = Boolean(
      filters.userId || filters.startWeekDate || filters.endWeekDate || filters.badgeCategory
    );
    const hasStreakFilters = Boolean(
      filters.userId || filters.startWeekDate || filters.endWeekDate || filters.streakType
    );

    const [
      badgeDefinitionCount,
      availableBadgeCategories,
      badgeAwardCount,
      weeklySnapshotCount,
      activeStreakCount,
      latestSnapshot,
      recentSnapshots,
      recentAwards,
      activeStreaks,
      availableStreakTypes,
    ] = await Promise.all([
      prisma.badgeDefinition.count({
        where: { isActive: true },
      }),
      prisma.badgeDefinition.findMany({
        where: { isActive: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
        select: {
          category: true,
        },
      }),
      prisma.badgeAward.count(),
      prisma.weeklySnapshot.count(),
      prisma.userStreak.count({
        where: { isActive: true },
      }),
      prisma.weeklySnapshot.findFirst({
        where: snapshotWhere,
        orderBy: { weekStartDate: 'desc' },
        select: { weekStartDate: true },
      }),
      prisma.weeklySnapshot.findMany({
        where: snapshotWhere,
        orderBy: [{ weekStartDate: 'desc' }, { createdAt: 'desc' }],
        take: filters.limit,
        select: {
          id: true,
          weekStartDate: true,
          weekEndDate: true,
          storyPointsCompleted: true,
          cardsCompleted: true,
          avgQualityScore: true,
          evaluationsSubmitted: true,
          evaluationRate: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              seniority: true,
            },
          },
        },
      }),
      prisma.badgeAward.findMany({
        where: awardWhere,
        orderBy: [{ awardedAt: 'desc' }, { id: 'desc' }],
        take: filters.limit,
        select: {
          id: true,
          awardedAt: true,
          metadata: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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
          triggerSnapshot: {
            select: {
              weekStartDate: true,
            },
          },
        },
      }),
      prisma.userStreak.findMany({
        where: activeStreakWhere,
        orderBy: [{ currentCount: 'desc' }, { longestCount: 'desc' }, { userId: 'asc' }],
        take: filters.limit,
        select: {
          id: true,
          userId: true,
          streakType: true,
          currentCount: true,
          longestCount: true,
          lastQualifiedWeek: true,
          graceUsed: true,
          isActive: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.userStreak.findMany({
        distinct: ['streakType'],
        orderBy: { streakType: 'asc' },
        select: {
          streakType: true,
        },
      }),
    ]);

    return apiSuccess({
      summary: {
        badgeDefinitions: badgeDefinitionCount,
        badgeAwards: hasAwardFilters
          ? await prisma.badgeAward.count({ where: awardWhere })
          : badgeAwardCount,
        weeklySnapshots: hasSnapshotFilters
          ? await prisma.weeklySnapshot.count({ where: snapshotWhere })
          : weeklySnapshotCount,
        activeStreaks: hasStreakFilters
          ? await prisma.userStreak.count({ where: activeStreakWhere })
          : activeStreakCount,
        latestSnapshotWeek: latestSnapshot?.weekStartDate.toISOString().slice(0, 10) ?? null,
      },
      filters: {
        userId: filters.userId,
        badgeCategory: filters.badgeCategory,
        streakType: filters.streakType,
        startWeekDate: filters.startWeekDate ? startOfUtcDay(filters.startWeekDate).toISOString().slice(0, 10) : null,
        endWeekDate: filters.endWeekDate ? startOfUtcDay(filters.endWeekDate).toISOString().slice(0, 10) : null,
        limit: filters.limit,
      },
      availableFilters: {
        badgeCategories: availableBadgeCategories.map((definition) => definition.category),
        streakTypes: availableStreakTypes.map((item) => {
          const meta = describeStreakType(item.streakType);
          return {
            value: item.streakType,
            label: meta.label,
            description: meta.description,
          };
        }),
      },
      recentSnapshots: recentSnapshots.map((snapshot) => ({
        id: snapshot.id,
        weekStartDate: snapshot.weekStartDate.toISOString().slice(0, 10),
        weekEndDate: snapshot.weekEndDate.toISOString().slice(0, 10),
        storyPointsCompleted: snapshot.storyPointsCompleted,
        cardsCompleted: snapshot.cardsCompleted,
        avgQualityScore: snapshot.avgQualityScore,
        evaluationsSubmitted: snapshot.evaluationsSubmitted,
        evaluationRate: snapshot.evaluationRate,
        createdAt: snapshot.createdAt.toISOString(),
        user: {
          id: snapshot.user.id,
          name: snapshot.user.name,
          email: snapshot.user.email,
          seniority: snapshot.user.seniority,
        },
      })),
      recentAwards: recentAwards.map((award) => ({
        id: award.id,
        awardedAt: award.awardedAt.toISOString(),
        metadata: award.metadata,
        user: {
          id: award.user.id,
          name: award.user.name,
          email: award.user.email,
        },
        badge: {
          id: award.badgeDefinition.id,
          slug: award.badgeDefinition.slug,
          name: award.badgeDefinition.name,
          description: award.badgeDefinition.description,
          category: award.badgeDefinition.category,
          tier: award.badgeDefinition.tier,
        },
        triggerSnapshotWeek: award.triggerSnapshot?.weekStartDate.toISOString().slice(0, 10) ?? null,
      })),
      activeStreaks: activeStreaks.map((streak) => ({
        ...serializeUserStreak(streak),
        user: {
          id: streak.user.id,
          name: streak.user.name,
          email: streak.user.email,
        },
      })),
    });
  } catch (error) {
    console.error('Failed to fetch rewards overview:', error);
    return ApiErrors.internal('Failed to fetch rewards overview');
  }
}
