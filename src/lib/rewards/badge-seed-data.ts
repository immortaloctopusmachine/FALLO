import type { BadgeCategory, Prisma } from '@prisma/client';

export interface SeedBadgeDefinition {
  slug: string;
  name: string;
  description: string;
  category: BadgeCategory;
  tier?: string | null;
  iconUrl?: string | null;
  conditions?: Prisma.InputJsonValue;
}

interface LoginBadgeThreshold {
  slug: string;
  name: string;
  description: string;
  milestone: number;
}

interface ReviewerBadgeThreshold {
  slug: string;
  name: string;
  description: string;
  totalReviews?: number;
  weeks?: number;
  evaluationRate?: number;
  consensusRate?: number;
  consensusTolerance?: number;
}

const velocityTierDefinitions = [
  {
    slug: 'warm-up',
    name: 'Warm-Up',
    description: 'Participation - just showing up.',
    thresholdType: 'flat_points',
    thresholdValue: 1,
  },
  {
    slug: 'steady-hand',
    name: 'Steady Hand',
    description: 'Below expected but consistent.',
    thresholdType: 'expected_ratio',
    thresholdValue: 0.5,
  },
  {
    slug: 'in-the-flow',
    name: 'In the Flow',
    description: 'Meeting expected output.',
    thresholdType: 'expected_ratio',
    thresholdValue: 1.0,
  },
  {
    slug: 'on-a-roll',
    name: 'On a Roll',
    description: 'Above expected.',
    thresholdType: 'expected_ratio',
    thresholdValue: 1.5,
  },
  {
    slug: 'powerhouse',
    name: 'Powerhouse',
    description: 'High output.',
    thresholdType: 'expected_ratio',
    thresholdValue: 2.0,
  },
  {
    slug: 'force-of-nature',
    name: 'Force of Nature',
    description: 'Exceptional sustained output.',
    thresholdType: 'expected_ratio',
    thresholdValue: 2.5,
  },
] as const;

export const VELOCITY_TIER_THRESHOLDS = velocityTierDefinitions;

const streakLevelDefinitions = [
  { slug: 'bronze', name: 'Bronze', weeks: 2 },
  { slug: 'silver', name: 'Silver', weeks: 4 },
  { slug: 'gold', name: 'Gold', weeks: 8 },
  { slug: 'platinum', name: 'Platinum', weeks: 13 },
  { slug: 'diamond', name: 'Diamond', weeks: 26 },
  { slug: 'legendary', name: 'Legendary', weeks: 52 },
] as const;

export const VELOCITY_STREAK_LEVELS = streakLevelDefinitions;

const loginStreakBadges = [
  { slug: 'login-streak-first-week', name: 'First Week', description: 'Building the habit.', milestone: 7 },
  { slug: 'login-streak-two-weeker', name: 'Two-Weeker', description: 'Getting comfortable.', milestone: 14 },
  { slug: 'login-streak-month-strong', name: 'Month Strong', description: 'Part of your routine.', milestone: 30 },
  { slug: 'login-streak-dedicated', name: 'Dedicated', description: 'The platform is home.', milestone: 60 },
  { slug: 'login-streak-quarterly-regular', name: 'Quarterly Regular', description: 'Three months straight.', milestone: 90 },
  { slug: 'login-streak-half-year-hero', name: 'Half-Year Hero', description: 'Seriously committed.', milestone: 180 },
  { slug: 'login-streak-year-one', name: 'Year One', description: 'A full year, every day.', milestone: 365 },
] as const satisfies ReadonlyArray<LoginBadgeThreshold>;

const loginMilestoneBadges = [
  { slug: 'login-milestone-first-timer', name: 'First Timer', description: 'Logged in for the first time.', milestone: 1 },
  { slug: 'login-milestone-getting-started', name: 'Getting Started', description: 'Welcome aboard.', milestone: 10 },
  { slug: 'login-milestone-regular', name: 'Regular', description: 'This is becoming a habit.', milestone: 30 },
  { slug: 'login-milestone-centurion-login', name: 'Centurion Login', description: '100 days in the app.', milestone: 100 },
  { slug: 'login-milestone-power-user', name: 'Power User', description: 'A fixture of the studio.', milestone: 250 },
  { slug: 'login-milestone-institution', name: 'Institution', description: 'You have been here a while.', milestone: 500 },
] as const satisfies ReadonlyArray<LoginBadgeThreshold>;

const velocityMilestoneBadges = [
  { slug: 'velocity-milestone-big-week', name: 'Big Week', description: 'A standout week against expectations.', multiplier: 2.5 },
  { slug: 'velocity-milestone-monster-week', name: 'Monster Week', description: 'An exceptional spike in output.', multiplier: 5.0 },
  { slug: 'velocity-milestone-studio-legend', name: 'Studio Legend', description: 'A week people will remember.', multiplier: 7.5 },
  { slug: 'velocity-milestone-centurion', name: 'Centurion', description: 'A peak-performance week at the top end.', multiplier: 10.0 },
] as const;

export const VELOCITY_MILESTONE_THRESHOLDS = velocityMilestoneBadges;

const qualityConsistencyBadges = [
  { slug: 'quality-craft-conscious', name: 'Craft Conscious', description: 'Consistently meeting the bar.', weeks: 2, deltaAboveExpected: 0 },
  { slug: 'quality-standard', name: 'Quality Standard', description: 'Reliable craftsmanship.', weeks: 8, deltaAboveExpected: 0 },
  { slug: 'quality-master-craftsperson', name: 'Master Craftsperson', description: 'Half a year of quality.', weeks: 26, deltaAboveExpected: 0 },
  { slug: 'quality-sharp-eye', name: 'Sharp Eye', description: 'Exceeding expectations.', weeks: 4, deltaAboveExpected: 0.5 },
  { slug: 'quality-studio-benchmark', name: 'Studio Benchmark', description: 'Setting the quality bar.', weeks: 13, deltaAboveExpected: 0.5 },
] as const;

export const QUALITY_CONSISTENCY_THRESHOLDS = qualityConsistencyBadges;

const combinedBadges = [
  { slug: 'combined-balanced-act', name: 'Balanced Act', description: 'Speed and quality together.', weeks: 4, velocityRatio: 1.0, qualityDeltaAboveExpected: 0 },
  { slug: 'combined-the-complete-package', name: 'The Complete Package', description: 'A rare combination.', weeks: 8, velocityRatio: 1.0, qualityDeltaAboveExpected: 0 },
  { slug: 'combined-studio-mvp', name: 'Studio MVP', description: 'Top of the game.', weeks: 8, velocityRatio: 1.0, qualityDeltaAboveExpected: 0.5 },
  { slug: 'combined-untouchable', name: 'Untouchable', description: 'Peak performance.', weeks: 4, velocityRatio: 1.5, qualityDeltaAboveExpected: 0.5 },
] as const;

export const COMBINED_BADGE_THRESHOLDS = combinedBadges;

const reviewerBadges: readonly ReviewerBadgeThreshold[] = [
  { slug: 'reviewer-first-reviews', name: 'First Reviews', description: 'Getting started.', totalReviews: 10 },
  { slug: 'reviewer-dedicated-reviewer', name: 'Dedicated Reviewer', description: 'Consistent evaluator.', totalReviews: 50 },
  { slug: 'reviewer-review-veteran', name: 'Review Veteran', description: 'Pillar of the quality system.', totalReviews: 200 },
  { slug: 'reviewer-always-watching', name: 'Always Watching', description: 'Never misses a review.', weeks: 4, evaluationRate: 0.9 },
  { slug: 'reviewer-quality-guardian', name: 'Quality Guardian', description: 'The review backbone.', weeks: 13, evaluationRate: 0.9 },
  { slug: 'reviewer-calibrated-eye', name: 'Calibrated Eye', description: 'Fair and consistent scorer.', totalReviews: 50, consensusRate: 0.8, consensusTolerance: 0.5 },
];

export const REVIEWER_BADGE_THRESHOLDS = reviewerBadges;

export const LOGIN_STREAK_BADGE_DEFINITIONS = loginStreakBadges.map((badge) => ({
  slug: badge.slug,
  name: badge.name,
  description: badge.description,
  category: 'LOGIN' as const,
  conditions: {
    family: 'login_streak',
    milestoneDays: badge.milestone,
  },
})) satisfies SeedBadgeDefinition[];

export const LOGIN_MILESTONE_BADGE_DEFINITIONS = loginMilestoneBadges.map((badge) => ({
  slug: badge.slug,
  name: badge.name,
  description: badge.description,
  category: 'LOGIN' as const,
  conditions: {
    family: 'login_total_days',
    milestoneDays: badge.milestone,
  },
})) satisfies SeedBadgeDefinition[];

export const VELOCITY_STREAK_BADGE_DEFINITIONS = velocityTierDefinitions.flatMap((tier) =>
  streakLevelDefinitions.map((level) => ({
    slug: `velocity-streak-${tier.slug}-${level.slug}`,
    name: `${tier.name} - ${level.name}`,
    description: `${tier.description} Keep it up for ${level.weeks} consecutive weeks.`,
    category: 'VELOCITY_STREAK' as const,
    tier: level.name,
    conditions: {
      family: 'velocity_streak',
      velocityTier: tier.slug,
      streakWeeks: level.weeks,
      thresholdType: tier.thresholdType,
      thresholdValue: tier.thresholdValue,
    },
  }))
) satisfies SeedBadgeDefinition[];

export const VELOCITY_MILESTONE_BADGE_DEFINITIONS = velocityMilestoneBadges.map((badge) => ({
  slug: badge.slug,
  name: badge.name,
  description: badge.description,
  category: 'VELOCITY_MILESTONE' as const,
  conditions: {
    family: 'velocity_milestone',
    expectedPointsMultiplier: badge.multiplier,
  },
})) satisfies SeedBadgeDefinition[];

export const QUALITY_CONSISTENCY_BADGE_DEFINITIONS = qualityConsistencyBadges.map((badge) => ({
  slug: badge.slug,
  name: badge.name,
  description: badge.description,
  category: 'QUALITY_CONSISTENCY' as const,
  conditions: {
    family: 'quality_consistency',
    streakWeeks: badge.weeks,
    deltaAboveExpected: badge.deltaAboveExpected,
  },
})) satisfies SeedBadgeDefinition[];

export const COMBINED_BADGE_DEFINITIONS = combinedBadges.map((badge) => ({
  slug: badge.slug,
  name: badge.name,
  description: badge.description,
  category: 'QUALITY_VELOCITY_COMBINED' as const,
  conditions: {
    family: 'quality_velocity_combined',
    streakWeeks: badge.weeks,
    velocityRatio: badge.velocityRatio,
    qualityDeltaAboveExpected: badge.qualityDeltaAboveExpected,
  },
})) satisfies SeedBadgeDefinition[];

export const REVIEWER_BADGE_DEFINITIONS = reviewerBadges.map((badge) => ({
  slug: badge.slug,
  name: badge.name,
  description: badge.description,
  category: 'REVIEWER' as const,
  conditions: {
    family: 'reviewer',
    ...(badge.totalReviews !== undefined ? { totalReviews: badge.totalReviews } : {}),
    ...(badge.weeks !== undefined ? { streakWeeks: badge.weeks } : {}),
    ...(badge.evaluationRate !== undefined ? { evaluationRate: badge.evaluationRate } : {}),
    ...(badge.consensusRate !== undefined ? { consensusRate: badge.consensusRate } : {}),
    ...(badge.consensusTolerance !== undefined ? { consensusTolerance: badge.consensusTolerance } : {}),
  },
})) satisfies SeedBadgeDefinition[];

export const MVP_BADGE_DEFINITIONS: SeedBadgeDefinition[] = [
  ...LOGIN_STREAK_BADGE_DEFINITIONS,
  ...LOGIN_MILESTONE_BADGE_DEFINITIONS,
  ...VELOCITY_STREAK_BADGE_DEFINITIONS,
  ...VELOCITY_MILESTONE_BADGE_DEFINITIONS,
  ...QUALITY_CONSISTENCY_BADGE_DEFINITIONS,
  ...COMBINED_BADGE_DEFINITIONS,
  ...REVIEWER_BADGE_DEFINITIONS,
];

const loginBadgeDefinitionMap = new Map<string, SeedBadgeDefinition>(
  [...LOGIN_STREAK_BADGE_DEFINITIONS, ...LOGIN_MILESTONE_BADGE_DEFINITIONS].map((definition) => [
    definition.slug,
    definition,
  ])
);

export function getTriggeredLoginBadgeDefinitions(summary: {
  currentStreak: number;
  totalLoginDays: number;
}): SeedBadgeDefinition[] {
  const slugs: string[] = [];

  for (const badge of loginStreakBadges) {
    if (summary.currentStreak === badge.milestone) {
      slugs.push(badge.slug);
    }
  }

  for (const badge of loginMilestoneBadges) {
    if (summary.totalLoginDays === badge.milestone) {
      slugs.push(badge.slug);
    }
  }

  const definitions: SeedBadgeDefinition[] = [];
  for (const slug of slugs) {
    const definition = loginBadgeDefinitionMap.get(slug);
    if (definition) {
      definitions.push(definition);
    }
  }

  return definitions;
}
