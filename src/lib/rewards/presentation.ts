import type { BadgeCategory, Prisma } from '@prisma/client';

export interface BadgeDisplayDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: BadgeCategory;
  tier?: string | null;
  iconUrl?: string | null;
  conditions?: Prisma.JsonValue | null;
}

interface BadgeCategoryMeta {
  label: string;
  subtitle: string;
  order: number;
}

interface BadgePalette {
  rim: string;
  shell: string;
  core: string;
  glow: string;
  ink: string;
  border: string;
}

const BADGE_CATEGORY_META: Record<BadgeCategory, BadgeCategoryMeta> = {
  LOGIN: {
    label: 'Login',
    subtitle: 'Show up, keep the streak alive, and build the habit.',
    order: 0,
  },
  VELOCITY_STREAK: {
    label: 'Velocity Streaks',
    subtitle: 'Sustain output over time and keep momentum going.',
    order: 1,
  },
  VELOCITY_MILESTONE: {
    label: 'Velocity Milestones',
    subtitle: 'Single-week output spikes that break expectations.',
    order: 2,
  },
  QUALITY_CONSISTENCY: {
    label: 'Quality Consistency',
    subtitle: 'Meet or exceed the quality bar over multiple weeks.',
    order: 3,
  },
  QUALITY_VELOCITY_COMBINED: {
    label: 'Balanced Performance',
    subtitle: 'Quality and speed both holding together at the same time.',
    order: 4,
  },
  REVIEWER: {
    label: 'Reviewer',
    subtitle: 'Recognition for reliable, calibrated review work.',
    order: 5,
  },
};

const VELOCITY_TIER_LABELS: Record<string, string> = {
  'warm-up': 'Warm-Up',
  'steady-hand': 'Steady Hand',
  'in-the-flow': 'In the Flow',
  'on-a-roll': 'On a Roll',
  powerhouse: 'Powerhouse',
  'force-of-nature': 'Force of Nature',
};

function asObject(value: Prisma.JsonValue | Prisma.InputJsonValue | unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function getBadgeCategoryMeta(category: BadgeCategory): BadgeCategoryMeta {
  return BADGE_CATEGORY_META[category];
}

export function compareBadgeCategories(a: BadgeCategory, b: BadgeCategory): number {
  return BADGE_CATEGORY_META[a].order - BADGE_CATEGORY_META[b].order;
}

export function getBadgeMonogram(name: string): string {
  const words = name
    .split(/[^A-Za-z0-9]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

export function getBadgePalette(category: BadgeCategory, tier?: string | null): BadgePalette {
  const tierKey = (tier ?? '').toLowerCase();

  if (category === 'LOGIN') {
    return {
      rim: 'linear-gradient(140deg, #F4D38B 0%, #C6883E 45%, #6B4422 100%)',
      shell: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.46), rgba(255,255,255,0) 42%), linear-gradient(160deg, #3F2A16 0%, #7B4D1F 45%, #C9852D 100%)',
      core: 'linear-gradient(160deg, rgba(255, 236, 183, 0.95), rgba(240, 167, 69, 0.92))',
      glow: 'rgba(244, 187, 86, 0.34)',
      ink: '#331A0A',
      border: 'rgba(255, 228, 159, 0.85)',
    };
  }

  if (category === 'VELOCITY_STREAK') {
    const goldTier = tierKey === 'legendary' || tierKey === 'diamond';
    return {
      rim: goldTier
        ? 'linear-gradient(140deg, #FFE59C 0%, #D19B2F 46%, #5A3A13 100%)'
        : 'linear-gradient(140deg, #B7D4FF 0%, #5B86D6 46%, #1B2E66 100%)',
      shell: goldTier
        ? 'radial-gradient(circle at 28% 24%, rgba(255,255,255,0.42), rgba(255,255,255,0) 42%), linear-gradient(160deg, #3C2A0F 0%, #8E651F 48%, #D8A53B 100%)'
        : 'radial-gradient(circle at 28% 24%, rgba(255,255,255,0.42), rgba(255,255,255,0) 42%), linear-gradient(160deg, #14244A 0%, #29559F 48%, #61A4FF 100%)',
      core: goldTier
        ? 'linear-gradient(160deg, rgba(255, 245, 210, 0.96), rgba(244, 190, 70, 0.92))'
        : 'linear-gradient(160deg, rgba(226, 240, 255, 0.96), rgba(110, 179, 255, 0.92))',
      glow: goldTier ? 'rgba(255, 209, 102, 0.32)' : 'rgba(82, 158, 255, 0.28)',
      ink: goldTier ? '#39200C' : '#0E2342',
      border: goldTier ? 'rgba(255, 235, 171, 0.84)' : 'rgba(190, 220, 255, 0.84)',
    };
  }

  if (category === 'VELOCITY_MILESTONE') {
    return {
      rim: 'linear-gradient(140deg, #FFD6A5 0%, #FF7A36 46%, #7A2300 100%)',
      shell: 'radial-gradient(circle at 30% 24%, rgba(255,255,255,0.42), rgba(255,255,255,0) 42%), linear-gradient(160deg, #4A180A 0%, #A33D16 46%, #FF7C38 100%)',
      core: 'linear-gradient(160deg, rgba(255, 232, 215, 0.96), rgba(255, 133, 72, 0.92))',
      glow: 'rgba(255, 122, 54, 0.3)',
      ink: '#3B1107',
      border: 'rgba(255, 214, 181, 0.88)',
    };
  }

  if (category === 'QUALITY_CONSISTENCY') {
    return {
      rim: 'linear-gradient(140deg, #BFFFEA 0%, #2FBF90 46%, #0E4B39 100%)',
      shell: 'radial-gradient(circle at 30% 24%, rgba(255,255,255,0.42), rgba(255,255,255,0) 42%), linear-gradient(160deg, #0C2F24 0%, #1D7E60 46%, #37D5A2 100%)',
      core: 'linear-gradient(160deg, rgba(224, 255, 245, 0.96), rgba(106, 230, 184, 0.92))',
      glow: 'rgba(61, 211, 158, 0.26)',
      ink: '#0B2B22',
      border: 'rgba(195, 255, 230, 0.88)',
    };
  }

  if (category === 'QUALITY_VELOCITY_COMBINED') {
    return {
      rim: 'linear-gradient(140deg, #FFE9B8 0%, #C684FF 36%, #FF6C97 68%, #38126B 100%)',
      shell: 'radial-gradient(circle at 30% 24%, rgba(255,255,255,0.42), rgba(255,255,255,0) 42%), linear-gradient(160deg, #22103D 0%, #6B2C96 38%, #C43A74 72%, #FFB45A 100%)',
      core: 'linear-gradient(160deg, rgba(255, 244, 212, 0.96), rgba(244, 150, 232, 0.92) 52%, rgba(255, 196, 104, 0.94) 100%)',
      glow: 'rgba(211, 114, 255, 0.28)',
      ink: '#2A123C',
      border: 'rgba(255, 230, 182, 0.86)',
    };
  }

  return {
    rim: 'linear-gradient(140deg, #D9E1FF 0%, #7D86CE 46%, #252F69 100%)',
    shell: 'radial-gradient(circle at 30% 24%, rgba(255,255,255,0.42), rgba(255,255,255,0) 42%), linear-gradient(160deg, #141B43 0%, #334491 46%, #8897EA 100%)',
    core: 'linear-gradient(160deg, rgba(238, 241, 255, 0.96), rgba(166, 180, 255, 0.92))',
    glow: 'rgba(124, 136, 224, 0.28)',
    ink: '#161E44',
    border: 'rgba(216, 225, 255, 0.88)',
  };
}

export function describeBadgeRequirement(
  badge: Pick<BadgeDisplayDefinition, 'category' | 'conditions'>
): string {
  const conditions = asObject(badge.conditions);
  const family = asString(conditions?.family);

  if (family === 'login_streak') {
    const days = asNumber(conditions?.milestoneDays);
    return days ? `Log in ${days} days in a row.` : 'Maintain a login streak.';
  }

  if (family === 'login_total_days') {
    const days = asNumber(conditions?.milestoneDays);
    if (days === 1) return 'Log in for the first time.';
    return days ? `Log in on ${days} total days.` : 'Keep logging in over time.';
  }

  if (family === 'velocity_streak') {
    const tier = asString(conditions?.velocityTier);
    const weeks = asNumber(conditions?.streakWeeks);
    const tierLabel = tier ? VELOCITY_TIER_LABELS[tier] ?? tier : 'your target';
    return weeks
      ? `Maintain ${tierLabel} velocity for ${weeks} consecutive weeks.`
      : 'Maintain velocity over consecutive weeks.';
  }

  if (family === 'velocity_milestone') {
    const multiplier = asNumber(conditions?.expectedPointsMultiplier);
    return multiplier
      ? `Hit ${multiplier}x your expected weekly output in a single week.`
      : 'Deliver a major one-week output spike.';
  }

  if (family === 'quality_consistency') {
    const weeks = asNumber(conditions?.streakWeeks);
    const delta = asNumber(conditions?.deltaAboveExpected) ?? 0;
    if (weeks && delta > 0) {
      return `Beat your expected quality bar by ${delta} for ${weeks} consecutive weeks.`;
    }
    if (weeks) {
      return `Meet your expected quality bar for ${weeks} consecutive weeks.`;
    }
    return 'Maintain quality over time.';
  }

  if (family === 'quality_velocity_combined') {
    const weeks = asNumber(conditions?.streakWeeks);
    const velocityRatio = asNumber(conditions?.velocityRatio);
    const qualityDelta = asNumber(conditions?.qualityDeltaAboveExpected) ?? 0;
    const velocityText = velocityRatio && velocityRatio > 1
      ? `${velocityRatio}x expected velocity`
      : 'expected velocity';
    const qualityText = qualityDelta > 0
      ? `quality ${qualityDelta} above your expected bar`
      : 'your expected quality bar';
    return weeks
      ? `Maintain ${velocityText} and ${qualityText} for ${weeks} consecutive weeks.`
      : 'Maintain quality and velocity together.';
  }

  if (family === 'reviewer') {
    const totalReviews = asNumber(conditions?.totalReviews);
    const weeks = asNumber(conditions?.streakWeeks);
    const evaluationRate = asNumber(conditions?.evaluationRate);
    const consensusRate = asNumber(conditions?.consensusRate);
    const tolerance = asNumber(conditions?.consensusTolerance);

    if (totalReviews && consensusRate && tolerance !== null) {
      return `Complete ${totalReviews} reviews while matching consensus ${Math.round(consensusRate * 100)}% of the time within ${tolerance}.`;
    }
    if (totalReviews) {
      return `Complete ${totalReviews} reviews.`;
    }
    if (weeks && evaluationRate) {
      return `Finish at least ${Math.round(evaluationRate * 100)}% of eligible reviews for ${weeks} consecutive weeks.`;
    }
    return 'Contribute reliable review work.';
  }

  if (badge.category === 'LOGIN') return 'Keep showing up in the app.';
  if (badge.category === 'REVIEWER') return 'Contribute review work consistently.';
  return 'Meet the badge requirements to unlock this reward.';
}
