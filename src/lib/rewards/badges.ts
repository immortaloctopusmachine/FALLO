import type { BadgeCategory, Prisma, PrismaClient } from '@prisma/client';
import type { LoginStreakSummary } from '@/lib/rewards/login-tracking';
import { MVP_BADGE_DEFINITIONS, getTriggeredLoginBadgeDefinitions } from '@/lib/rewards/badge-seed-data';
import { describeBadgeRequirement } from '@/lib/rewards/presentation';

type RewardsDbClient = PrismaClient | Prisma.TransactionClient;

const BADGE_CATEGORY_ORDER: BadgeCategory[] = [
  'LOGIN',
  'VELOCITY_STREAK',
  'VELOCITY_MILESTONE',
  'QUALITY_CONSISTENCY',
  'QUALITY_VELOCITY_COMBINED',
  'REVIEWER',
];

function categorySortValue(category: BadgeCategory): number {
  const index = BADGE_CATEGORY_ORDER.indexOf(category);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function nextUtcDay(date: Date): Date {
  const next = startOfUtcDay(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export async function ensureBadgeDefinitionsSeeded(db: RewardsDbClient): Promise<void> {
  for (const definition of MVP_BADGE_DEFINITIONS) {
    await db.badgeDefinition.upsert({
      where: { slug: definition.slug },
      update: {
        name: definition.name,
        description: definition.description,
        category: definition.category,
        tier: definition.tier ?? null,
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
}

export async function listActiveBadgeDefinitions(db: RewardsDbClient) {
  const definitions = await db.badgeDefinition.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      tier: true,
      iconUrl: true,
      conditions: true,
    },
  });

  return definitions.sort((a, b) => {
    const categoryCompare = categorySortValue(a.category) - categorySortValue(b.category);
    if (categoryCompare !== 0) return categoryCompare;
    return a.name.localeCompare(b.name);
  });
}

function serializeBadgeAward(
  award: {
    id: string;
    awardedAt: Date;
    metadata: Prisma.JsonValue | null;
    badgeDefinition: {
      id: string;
      slug: string;
      name: string;
      description: string;
      category: BadgeCategory;
      tier: string | null;
      iconUrl: string | null;
    };
  }
) {
  return {
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
      iconUrl: award.badgeDefinition.iconUrl,
    },
  };
}

export async function listRecentBadgeAwards(
  db: RewardsDbClient,
  userId: string,
  limit: number = 6
) {
  const awards = await db.badgeAward.findMany({
    where: { userId },
    orderBy: { awardedAt: 'desc' },
    take: limit,
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
          iconUrl: true,
        },
      },
    },
  });

  return awards.map(serializeBadgeAward);
}

export async function getUserBadgeCollection(db: RewardsDbClient, userId: string) {
  const awards = await db.badgeAward.findMany({
    where: { userId },
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
          iconUrl: true,
        },
      },
    },
  });

  const trophyCaseMap = new Map<
    string,
    {
      badge: ReturnType<typeof serializeBadgeAward>['badge'];
      timesEarned: number;
      firstAwardedAt: string;
      lastAwardedAt: string;
    }
  >();

  for (const award of awards) {
    const serialized = serializeBadgeAward(award);
    const key = serialized.badge.id;
    const existing = trophyCaseMap.get(key);

    if (!existing) {
      trophyCaseMap.set(key, {
        badge: serialized.badge,
        timesEarned: 1,
        firstAwardedAt: serialized.awardedAt,
        lastAwardedAt: serialized.awardedAt,
      });
      continue;
    }

    existing.timesEarned += 1;
    existing.firstAwardedAt = serialized.awardedAt < existing.firstAwardedAt
      ? serialized.awardedAt
      : existing.firstAwardedAt;
    existing.lastAwardedAt = serialized.awardedAt > existing.lastAwardedAt
      ? serialized.awardedAt
      : existing.lastAwardedAt;
  }

  const trophyCase = Array.from(trophyCaseMap.values()).sort((a, b) => {
    const categoryCompare = categorySortValue(a.badge.category) - categorySortValue(b.badge.category);
    if (categoryCompare !== 0) return categoryCompare;
    return b.lastAwardedAt.localeCompare(a.lastAwardedAt);
  });

  return {
    userId,
    totalAwards: awards.length,
    uniqueBadges: trophyCase.length,
    trophyCase,
    recentAwards: awards.slice(0, 12).map(serializeBadgeAward),
  };
}

export async function awardLoginBadges(
  db: RewardsDbClient,
  userId: string,
  streak: LoginStreakSummary,
  awardedAt: Date = new Date()
) {
  const triggeredDefinitions = getTriggeredLoginBadgeDefinitions({
    currentStreak: streak.currentStreak,
    totalLoginDays: streak.totalLoginDays,
  });

  if (triggeredDefinitions.length === 0) {
    return [];
  }

  await ensureBadgeDefinitionsSeeded(db);

  const definitions = await db.badgeDefinition.findMany({
    where: {
      slug: {
        in: triggeredDefinitions.map((definition) => definition.slug),
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      tier: true,
      iconUrl: true,
      conditions: true,
    },
  });

  const definitionsBySlug = new Map(definitions.map((definition) => [definition.slug, definition]));
  const dayStart = startOfUtcDay(awardedAt);
  const dayEnd = nextUtcDay(awardedAt);
  const createdAwards: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    awardedAt: string;
  }> = [];

  for (const definition of triggeredDefinitions) {
    const storedDefinition = definitionsBySlug.get(definition.slug);
    if (!storedDefinition) continue;

    const existingSameDayAward = await db.badgeAward.findFirst({
      where: {
        userId,
        badgeDefinitionId: storedDefinition.id,
        awardedAt: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      select: { id: true },
    });

    if (existingSameDayAward) {
      continue;
    }

    const badgeAward = await db.badgeAward.create({
      data: {
        userId,
        badgeDefinitionId: storedDefinition.id,
        awardedAt,
        metadata: {
          family:
            definition.slug.startsWith('login-streak-')
              ? 'login_streak'
              : 'login_total_days',
          currentStreak: streak.currentStreak,
          totalLoginDays: streak.totalLoginDays,
          lastLoginDate: streak.lastLoginDate?.toISOString().slice(0, 10) ?? null,
        },
      },
      select: {
        id: true,
        awardedAt: true,
      },
    });

    await db.notification.create({
      data: {
        userId,
        type: 'badge_awarded',
        title: `Badge earned: ${storedDefinition.name}`,
        message: storedDefinition.description,
        data: {
          badgeSlug: storedDefinition.slug,
          badgeDefinitionId: storedDefinition.id,
          badgeName: storedDefinition.name,
          badgeDescription: storedDefinition.description,
          badgeIconUrl: storedDefinition.iconUrl,
          badgeCategory: storedDefinition.category,
          badgeTier: storedDefinition.tier,
          reason: describeBadgeRequirement({
            category: storedDefinition.category,
            conditions: storedDefinition.conditions,
          }),
        },
      },
    });

    createdAwards.push({
      id: badgeAward.id,
      slug: storedDefinition.slug,
      name: storedDefinition.name,
      description: storedDefinition.description,
      awardedAt: badgeAward.awardedAt.toISOString(),
    });
  }

  return createdAwards;
}
