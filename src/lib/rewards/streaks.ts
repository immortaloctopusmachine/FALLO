import type { PrismaClient, UserStreak } from '@prisma/client';
import {
  COMBINED_BADGE_THRESHOLDS,
  QUALITY_CONSISTENCY_THRESHOLDS,
  VELOCITY_TIER_THRESHOLDS,
} from '@/lib/rewards/badge-seed-data';

type RewardsDbClient = PrismaClient;

export interface SerializedUserStreak {
  id: string;
  streakType: string;
  label: string;
  description: string;
  currentCount: number;
  longestCount: number;
  lastQualifiedWeek: string | null;
  graceUsed: boolean;
  isActive: boolean;
}

function titleCaseFromSlug(value: string): string {
  return value
    .split(/[-_:]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function describeStreakType(streakType: string): { label: string; description: string } {
  if (streakType.startsWith('velocity:')) {
    const tierSlug = streakType.slice('velocity:'.length);
    const tier = VELOCITY_TIER_THRESHOLDS.find((candidate) => candidate.slug === tierSlug);
    if (tier) {
      return {
        label: tier.name,
        description: `${tier.name} velocity streak`,
      };
    }
  }

  if (streakType === 'quality:expected') {
    const badge = QUALITY_CONSISTENCY_THRESHOLDS.find((candidate) => candidate.slug === 'quality-standard');
    return {
      label: badge?.name ?? 'Quality Standard',
      description: 'Weeks meeting expected quality',
    };
  }

  if (streakType === 'quality:above-expected') {
    const badge = QUALITY_CONSISTENCY_THRESHOLDS.find((candidate) => candidate.slug === 'quality-sharp-eye');
    return {
      label: badge?.name ?? 'Sharp Eye',
      description: 'Weeks above expected quality',
    };
  }

  if (streakType.startsWith('combined:')) {
    const slugSuffix = streakType.slice('combined:'.length);
    const badge = COMBINED_BADGE_THRESHOLDS.find(
      (candidate) => candidate.slug === `combined-${slugSuffix}`
    );
    if (badge) {
      return {
        label: badge.name,
        description: badge.description,
      };
    }
  }

  if (streakType === 'reviewer:evaluation-rate-90') {
    return {
      label: 'Always Watching',
      description: 'Weeks with 90%+ review completion',
    };
  }

  return {
    label: titleCaseFromSlug(streakType),
    description: 'Active streak',
  };
}

export function serializeUserStreak(streak: Pick<
  UserStreak,
  'id' | 'streakType' | 'currentCount' | 'longestCount' | 'lastQualifiedWeek' | 'graceUsed' | 'isActive'
>): SerializedUserStreak {
  const meta = describeStreakType(streak.streakType);

  return {
    id: streak.id,
    streakType: streak.streakType,
    label: meta.label,
    description: meta.description,
    currentCount: streak.currentCount,
    longestCount: streak.longestCount,
    lastQualifiedWeek: streak.lastQualifiedWeek?.toISOString().slice(0, 10) ?? null,
    graceUsed: streak.graceUsed,
    isActive: streak.isActive,
  };
}

export async function listSerializedActiveStreaks(db: RewardsDbClient, userId: string) {
  const streaks = await db.userStreak.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: [{ currentCount: 'desc' }, { streakType: 'asc' }],
    select: {
      id: true,
      streakType: true,
      currentCount: true,
      longestCount: true,
      lastQualifiedWeek: true,
      graceUsed: true,
      isActive: true,
    },
  });

  return streaks.map(serializeUserStreak);
}
