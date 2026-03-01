import type {
  BadgeDefinition,
  Prisma,
  PrismaClient,
  Seniority,
  WeeklySnapshot,
} from '@prisma/client';
import { aggregateDimensionScores, computeOverallAverage } from '@/lib/quality-review';
import {
  COMBINED_BADGE_THRESHOLDS,
  QUALITY_CONSISTENCY_THRESHOLDS,
  REVIEWER_BADGE_THRESHOLDS,
  VELOCITY_MILESTONE_THRESHOLDS,
  VELOCITY_STREAK_LEVELS,
  VELOCITY_TIER_THRESHOLDS,
} from '@/lib/rewards/badge-seed-data';
import { ensureBadgeDefinitionsSeeded } from '@/lib/rewards/badges';
import { describeBadgeRequirement } from '@/lib/rewards/presentation';
import { DEFAULT_SENIORITY_CONFIGS } from '@/lib/rewards/seniority';

type RewardsDbClient = PrismaClient | Prisma.TransactionClient;

type SeniorityConfigLike = {
  seniority: Seniority;
  expectedPointsPerWeek: number;
  expectedQualityAvg: number;
  warmUpPoints: number;
  steadyHandRatio: number;
  inTheFlowRatio: number;
  onARollRatio: number;
  powerhouseRatio: number;
  forceOfNatureRatio: number;
};

type SnapshotForEvaluation = Pick<
  WeeklySnapshot,
  | 'id'
  | 'userId'
  | 'weekStartDate'
  | 'weekEndDate'
  | 'seniorityAtSnapshot'
  | 'storyPointsCompleted'
  | 'avgQualityScore'
  | 'evaluationsSubmitted'
  | 'evaluationEligible'
  | 'evaluationRate'
>;

type StreakStatus = 'qualifies' | 'neutral' | 'fails';

export interface WeeklyBadgeEvaluationResult {
  weekStartDate: Date;
  usersEvaluated: number;
  awardsCreated: number;
  streaksUpdated: number;
  createdByCategory: Record<string, number>;
}

export interface ComputedStreakState {
  currentCount: number;
  longestCount: number;
  lastQualifiedWeek: Date | null;
  isActive: boolean;
}

const QUALITY_EXPECTED_STREAK_TYPE = 'quality:expected';
const QUALITY_ABOVE_EXPECTED_STREAK_TYPE = 'quality:above-expected';
const REVIEWER_RATE_STREAK_TYPE = 'reviewer:evaluation-rate-90';

function weekTimestamp(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isConsecutiveWeek(previousWeek: Date, currentWeek: Date): boolean {
  return weekTimestamp(currentWeek) - weekTimestamp(previousWeek) === 7 * 86_400_000;
}

function evaluateSingleAverage(
  scores: Array<{ dimensionId: string; score: string }>
): number | null {
  const normalized = scores
    .map((score) => ({
      dimensionId: score.dimensionId,
      score: score.score,
    }))
    .filter(
      (score): score is { dimensionId: string; score: 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT_APPLICABLE' } =>
        typeof score.dimensionId === 'string'
          && typeof score.score === 'string'
          && ['LOW', 'MEDIUM', 'HIGH', 'NOT_APPLICABLE'].includes(score.score)
    );

  if (normalized.length === 0) {
    return null;
  }

  return computeOverallAverage(
    aggregateDimensionScores(normalized).map((aggregate) => ({
      average: aggregate.average,
    }))
  );
}

function buildSeniorityConfigMap(
  configs: SeniorityConfigLike[]
): Map<Seniority, SeniorityConfigLike> {
  const map = new Map<Seniority, SeniorityConfigLike>();
  for (const config of DEFAULT_SENIORITY_CONFIGS) {
    map.set(config.seniority, config);
  }
  for (const config of configs) {
    map.set(config.seniority, config);
  }
  return map;
}

function getVelocityThreshold(
  tierSlug: string,
  config: SeniorityConfigLike | null
): number | null {
  const tier = VELOCITY_TIER_THRESHOLDS.find((candidate) => candidate.slug === tierSlug);
  if (!tier) return null;

  if (tier.thresholdType === 'flat_points') {
    return tier.thresholdValue;
  }

  if (!config) {
    return null;
  }

  return config.expectedPointsPerWeek * tier.thresholdValue;
}

function velocityStreakType(tierSlug: string): string {
  return `velocity:${tierSlug}`;
}

function combinedStreakType(badgeSlug: string): string {
  return `combined:${badgeSlug.replace(/^combined-/, '')}`;
}

export function computeStreakState(
  entries: Array<{ weekStartDate: Date; status: StreakStatus }>
): ComputedStreakState {
  const sortedEntries = [...entries].sort(
    (a, b) => weekTimestamp(a.weekStartDate) - weekTimestamp(b.weekStartDate)
  );

  let currentCount = 0;
  let longestCount = 0;
  let lastQualifiedWeek: Date | null = null;
  let previousWeek: Date | null = null;

  for (const entry of sortedEntries) {
    if (previousWeek && !isConsecutiveWeek(previousWeek, entry.weekStartDate)) {
      currentCount = 0;
    }

    if (entry.status === 'qualifies') {
      currentCount += 1;
      longestCount = Math.max(longestCount, currentCount);
      lastQualifiedWeek = entry.weekStartDate;
    } else if (entry.status === 'fails') {
      currentCount = 0;
    }

    previousWeek = entry.weekStartDate;
  }

  return {
    currentCount,
    longestCount,
    lastQualifiedWeek,
    isActive: currentCount > 0,
  };
}

async function createBadgeNotification(
  db: RewardsDbClient,
  userId: string,
  definition: Pick<BadgeDefinition, 'id' | 'slug' | 'name' | 'description' | 'category' | 'tier' | 'iconUrl' | 'conditions'>
) {
  await db.notification.create({
    data: {
      userId,
      type: 'badge_awarded',
      title: `Badge earned: ${definition.name}`,
      message: definition.description,
      data: {
        badgeSlug: definition.slug,
        badgeDefinitionId: definition.id,
        badgeName: definition.name,
        badgeDescription: definition.description,
        badgeIconUrl: definition.iconUrl,
        badgeCategory: definition.category,
        badgeTier: definition.tier,
        reason: describeBadgeRequirement({
          category: definition.category,
          conditions: definition.conditions,
        }),
      },
    },
  });
}

async function createSnapshotBadgeAward(
  db: RewardsDbClient,
  params: {
    userId: string;
    definition: Pick<BadgeDefinition, 'id' | 'slug' | 'name' | 'description' | 'category' | 'tier' | 'iconUrl' | 'conditions'>;
    snapshotId: string;
    awardedAt: Date;
    metadata: Prisma.InputJsonValue;
  }
): Promise<boolean> {
  const existing = await db.badgeAward.findFirst({
    where: {
      userId: params.userId,
      badgeDefinitionId: params.definition.id,
      triggerSnapshotId: params.snapshotId,
    },
    select: { id: true },
  });

  if (existing) {
    return false;
  }

  await db.badgeAward.create({
    data: {
      userId: params.userId,
      badgeDefinitionId: params.definition.id,
      triggerSnapshotId: params.snapshotId,
      awardedAt: params.awardedAt,
      metadata: params.metadata,
    },
  });

  await createBadgeNotification(db, params.userId, params.definition);
  return true;
}

async function createOneTimeBadgeAward(
  db: RewardsDbClient,
  params: {
    userId: string;
    definition: Pick<BadgeDefinition, 'id' | 'slug' | 'name' | 'description' | 'category' | 'tier' | 'iconUrl' | 'conditions'>;
    snapshotId: string;
    awardedAt: Date;
    metadata: Prisma.InputJsonValue;
  }
): Promise<boolean> {
  const existing = await db.badgeAward.findFirst({
    where: {
      userId: params.userId,
      badgeDefinitionId: params.definition.id,
    },
    select: { id: true },
  });

  if (existing) {
    return false;
  }

  await db.badgeAward.create({
    data: {
      userId: params.userId,
      badgeDefinitionId: params.definition.id,
      triggerSnapshotId: params.snapshotId,
      awardedAt: params.awardedAt,
      metadata: params.metadata,
    },
  });

  await createBadgeNotification(db, params.userId, params.definition);
  return true;
}

async function syncUserStreak(
  db: RewardsDbClient,
  params: {
    userId: string;
    streakType: string;
    streak: ComputedStreakState;
  }
): Promise<boolean> {
  const { streak } = params;
  if (streak.longestCount === 0) {
    return false;
  }

  await db.userStreak.upsert({
    where: {
      userId_streakType: {
        userId: params.userId,
        streakType: params.streakType,
      },
    },
    update: {
      currentCount: streak.currentCount,
      longestCount: streak.longestCount,
      lastQualifiedWeek: streak.lastQualifiedWeek,
      graceUsed: false,
      isActive: streak.isActive,
    },
    create: {
      userId: params.userId,
      streakType: params.streakType,
      currentCount: streak.currentCount,
      longestCount: streak.longestCount,
      lastQualifiedWeek: streak.lastQualifiedWeek,
      graceUsed: false,
      isActive: streak.isActive,
    },
  });

  return true;
}

export async function evaluateWeeklyBadges(
  db: RewardsDbClient,
  params: { weekStartDate: Date; userIds?: string[] }
): Promise<WeeklyBadgeEvaluationResult> {
  await ensureBadgeDefinitionsSeeded(db);

  const targetSnapshots = await db.weeklySnapshot.findMany({
    where: {
      weekStartDate: params.weekStartDate,
      ...(params.userIds?.length ? { userId: { in: params.userIds } } : {}),
    },
    select: {
      id: true,
      userId: true,
      weekStartDate: true,
      weekEndDate: true,
      seniorityAtSnapshot: true,
      storyPointsCompleted: true,
      avgQualityScore: true,
      evaluationsSubmitted: true,
      evaluationEligible: true,
      evaluationRate: true,
    },
  });

  if (targetSnapshots.length === 0) {
    return {
      weekStartDate: params.weekStartDate,
      usersEvaluated: 0,
      awardsCreated: 0,
      streaksUpdated: 0,
      createdByCategory: {},
    };
  }

  const userIds = targetSnapshots.map((snapshot) => snapshot.userId);
  const [seniorityConfigs, historicalSnapshots, badgeDefinitions] = await Promise.all([
    db.seniorityConfig.findMany({
      select: {
        seniority: true,
        expectedPointsPerWeek: true,
        expectedQualityAvg: true,
        warmUpPoints: true,
        steadyHandRatio: true,
        inTheFlowRatio: true,
        onARollRatio: true,
        powerhouseRatio: true,
        forceOfNatureRatio: true,
      },
    }),
    db.weeklySnapshot.findMany({
      where: {
        userId: { in: userIds },
        weekStartDate: { lte: params.weekStartDate },
      },
      orderBy: [{ userId: 'asc' }, { weekStartDate: 'asc' }],
      select: {
        id: true,
        userId: true,
        weekStartDate: true,
        weekEndDate: true,
        seniorityAtSnapshot: true,
        storyPointsCompleted: true,
        avgQualityScore: true,
        evaluationsSubmitted: true,
        evaluationEligible: true,
        evaluationRate: true,
      },
    }),
    db.badgeDefinition.findMany({
      where: {
        slug: {
          in: [
            ...VELOCITY_STREAK_LEVELS.flatMap((level) =>
              VELOCITY_TIER_THRESHOLDS.map((tier) => `velocity-streak-${tier.slug}-${level.slug}`)
            ),
            ...VELOCITY_MILESTONE_THRESHOLDS.map((badge) => badge.slug),
            ...QUALITY_CONSISTENCY_THRESHOLDS.map((badge) => badge.slug),
            ...COMBINED_BADGE_THRESHOLDS.map((badge) => badge.slug),
            ...REVIEWER_BADGE_THRESHOLDS.map((badge) => badge.slug),
          ],
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
    }),
  ]);

  const configBySeniority = buildSeniorityConfigMap(seniorityConfigs);
  const definitionsBySlug = new Map(badgeDefinitions.map((definition) => [definition.slug, definition]));
  const snapshotsByUser = new Map<string, SnapshotForEvaluation[]>();
  const latestWeekByUser = new Map<string, Date>();
  const createdByCategory = new Map<string, number>();

  for (const snapshot of historicalSnapshots) {
    const existing = snapshotsByUser.get(snapshot.userId) ?? [];
    existing.push(snapshot);
    snapshotsByUser.set(snapshot.userId, existing);
    latestWeekByUser.set(snapshot.userId, snapshot.weekStartDate);
  }

  let awardsCreated = 0;
  let streaksUpdated = 0;

  for (const targetSnapshot of targetSnapshots) {
    const history = snapshotsByUser.get(targetSnapshot.userId) ?? [];
    const isLatestWeekForUser =
      weekTimestamp(latestWeekByUser.get(targetSnapshot.userId) ?? targetSnapshot.weekStartDate)
      === weekTimestamp(targetSnapshot.weekStartDate);
    const awardedAt = new Date(targetSnapshot.weekEndDate);

    const awardIfCreated = (created: boolean, category: string) => {
      if (!created) return;
      awardsCreated += 1;
      createdByCategory.set(category, (createdByCategory.get(category) ?? 0) + 1);
    };

    for (const tier of VELOCITY_TIER_THRESHOLDS) {
      const streakEntries = history.map((snapshot) => {
        const config = snapshot.seniorityAtSnapshot
          ? configBySeniority.get(snapshot.seniorityAtSnapshot)
          : null;
        const threshold = getVelocityThreshold(tier.slug, config ?? null);
        return {
          weekStartDate: snapshot.weekStartDate,
          status:
            threshold !== null && snapshot.storyPointsCompleted >= threshold
              ? ('qualifies' as const)
              : ('fails' as const),
        };
      });

      const streak = computeStreakState(streakEntries);

      if (isLatestWeekForUser) {
        const updated = await syncUserStreak(db, {
          userId: targetSnapshot.userId,
          streakType: velocityStreakType(tier.slug),
          streak,
        });
        if (updated) streaksUpdated += 1;
      }

      for (const level of VELOCITY_STREAK_LEVELS) {
        if (streak.currentCount !== level.weeks) continue;

        const definition = definitionsBySlug.get(`velocity-streak-${tier.slug}-${level.slug}`);
        if (!definition) continue;

        const created = await createSnapshotBadgeAward(db, {
          userId: targetSnapshot.userId,
          definition,
          snapshotId: targetSnapshot.id,
          awardedAt,
          metadata: {
            family: 'velocity_streak',
            streakType: velocityStreakType(tier.slug),
            level: level.slug,
            streakWeeks: streak.currentCount,
            weekStartDate: targetSnapshot.weekStartDate.toISOString(),
          },
        });
        awardIfCreated(created, definition.category);
      }
    }

    const activeConfig = targetSnapshot.seniorityAtSnapshot
      ? configBySeniority.get(targetSnapshot.seniorityAtSnapshot)
      : null;

    if (activeConfig) {
      for (const badge of VELOCITY_MILESTONE_THRESHOLDS) {
        if (targetSnapshot.storyPointsCompleted < activeConfig.expectedPointsPerWeek * badge.multiplier) {
          continue;
        }

        const definition = definitionsBySlug.get(badge.slug);
        if (!definition) continue;

        const created = await createOneTimeBadgeAward(db, {
          userId: targetSnapshot.userId,
          definition,
          snapshotId: targetSnapshot.id,
          awardedAt,
          metadata: {
            family: 'velocity_milestone',
            expectedPointsPerWeek: activeConfig.expectedPointsPerWeek,
            multiplier: badge.multiplier,
            achievedPoints: targetSnapshot.storyPointsCompleted,
            weekStartDate: targetSnapshot.weekStartDate.toISOString(),
          },
        });
        awardIfCreated(created, definition.category);
      }

      const qualityExpectedStreak = computeStreakState(
        history.map((snapshot) => {
          const config = snapshot.seniorityAtSnapshot
            ? configBySeniority.get(snapshot.seniorityAtSnapshot)
            : null;
          return {
            weekStartDate: snapshot.weekStartDate,
            status:
              config && snapshot.avgQualityScore !== null && snapshot.avgQualityScore >= config.expectedQualityAvg
                ? ('qualifies' as const)
                : ('fails' as const),
          };
        })
      );
      const qualityAboveExpectedStreak = computeStreakState(
        history.map((snapshot) => {
          const config = snapshot.seniorityAtSnapshot
            ? configBySeniority.get(snapshot.seniorityAtSnapshot)
            : null;
          return {
            weekStartDate: snapshot.weekStartDate,
            status:
              config && snapshot.avgQualityScore !== null && snapshot.avgQualityScore >= config.expectedQualityAvg + 0.5
                ? ('qualifies' as const)
                : ('fails' as const),
          };
        })
      );

      if (isLatestWeekForUser) {
        const updatedExpected = await syncUserStreak(db, {
          userId: targetSnapshot.userId,
          streakType: QUALITY_EXPECTED_STREAK_TYPE,
          streak: qualityExpectedStreak,
        });
        const updatedAbove = await syncUserStreak(db, {
          userId: targetSnapshot.userId,
          streakType: QUALITY_ABOVE_EXPECTED_STREAK_TYPE,
          streak: qualityAboveExpectedStreak,
        });
        if (updatedExpected) streaksUpdated += 1;
        if (updatedAbove) streaksUpdated += 1;
      }

      for (const badge of QUALITY_CONSISTENCY_THRESHOLDS) {
        const streak = badge.deltaAboveExpected > 0 ? qualityAboveExpectedStreak : qualityExpectedStreak;
        if (streak.currentCount !== badge.weeks) continue;

        const definition = definitionsBySlug.get(badge.slug);
        if (!definition) continue;

        const created = await createSnapshotBadgeAward(db, {
          userId: targetSnapshot.userId,
          definition,
          snapshotId: targetSnapshot.id,
          awardedAt,
          metadata: {
            family: 'quality_consistency',
            streakType:
              badge.deltaAboveExpected > 0
                ? QUALITY_ABOVE_EXPECTED_STREAK_TYPE
                : QUALITY_EXPECTED_STREAK_TYPE,
            streakWeeks: streak.currentCount,
            deltaAboveExpected: badge.deltaAboveExpected,
            weekStartDate: targetSnapshot.weekStartDate.toISOString(),
          },
        });
        awardIfCreated(created, definition.category);
      }

      for (const badge of COMBINED_BADGE_THRESHOLDS) {
        const streakType = combinedStreakType(badge.slug);
        const streak = computeStreakState(
          history.map((snapshot) => {
            const config = snapshot.seniorityAtSnapshot
              ? configBySeniority.get(snapshot.seniorityAtSnapshot)
              : null;
            const qualifies =
              Boolean(config)
              && snapshot.avgQualityScore !== null
              && snapshot.avgQualityScore >= (config?.expectedQualityAvg ?? Infinity) + badge.qualityDeltaAboveExpected
              && snapshot.storyPointsCompleted >= (config?.expectedPointsPerWeek ?? Infinity) * badge.velocityRatio;

            return {
              weekStartDate: snapshot.weekStartDate,
              status: qualifies ? ('qualifies' as const) : ('fails' as const),
            };
          })
        );

        if (isLatestWeekForUser) {
          const updated = await syncUserStreak(db, {
            userId: targetSnapshot.userId,
            streakType,
            streak,
          });
          if (updated) streaksUpdated += 1;
        }

        if (streak.currentCount !== badge.weeks) continue;

        const definition = definitionsBySlug.get(badge.slug);
        if (!definition) continue;

        const created = await createSnapshotBadgeAward(db, {
          userId: targetSnapshot.userId,
          definition,
          snapshotId: targetSnapshot.id,
          awardedAt,
          metadata: {
            family: 'quality_velocity_combined',
            streakType,
            streakWeeks: streak.currentCount,
            velocityRatio: badge.velocityRatio,
            qualityDeltaAboveExpected: badge.qualityDeltaAboveExpected,
            weekStartDate: targetSnapshot.weekStartDate.toISOString(),
          },
        });
        awardIfCreated(created, definition.category);
      }
    }

    const totalEvaluationsSubmitted = history.reduce(
      (sum, snapshot) => sum + snapshot.evaluationsSubmitted,
      0
    );

    for (const badge of REVIEWER_BADGE_THRESHOLDS) {
      if (!badge.totalReviews || badge.slug === 'reviewer-calibrated-eye') {
        continue;
      }

      if (totalEvaluationsSubmitted < badge.totalReviews) {
        continue;
      }

      const definition = definitionsBySlug.get(badge.slug);
      if (!definition) continue;

      const created = await createOneTimeBadgeAward(db, {
        userId: targetSnapshot.userId,
        definition,
        snapshotId: targetSnapshot.id,
        awardedAt,
        metadata: {
          family: 'reviewer_total_reviews',
          totalEvaluationsSubmitted,
          threshold: badge.totalReviews,
          weekStartDate: targetSnapshot.weekStartDate.toISOString(),
        },
      });
      awardIfCreated(created, definition.category);
    }

    const reviewerRateStreak = computeStreakState(
      history.map((snapshot) => ({
        weekStartDate: snapshot.weekStartDate,
        status:
          snapshot.evaluationEligible === 0
            ? ('neutral' as const)
            : snapshot.evaluationRate !== null && snapshot.evaluationRate >= 0.9
              ? ('qualifies' as const)
              : ('fails' as const),
      }))
    );

    if (isLatestWeekForUser) {
      const updated = await syncUserStreak(db, {
        userId: targetSnapshot.userId,
        streakType: REVIEWER_RATE_STREAK_TYPE,
        streak: reviewerRateStreak,
      });
      if (updated) streaksUpdated += 1;
    }

    for (const badge of REVIEWER_BADGE_THRESHOLDS) {
      if (!badge.weeks || badge.evaluationRate !== 0.9) continue;
      if (targetSnapshot.evaluationEligible === 0 || targetSnapshot.evaluationRate === null || targetSnapshot.evaluationRate < 0.9) {
        continue;
      }
      if (reviewerRateStreak.currentCount !== badge.weeks) continue;

      const definition = definitionsBySlug.get(badge.slug);
      if (!definition) continue;

      const created = await createSnapshotBadgeAward(db, {
        userId: targetSnapshot.userId,
        definition,
        snapshotId: targetSnapshot.id,
        awardedAt,
        metadata: {
          family: 'reviewer_rate_streak',
          streakType: REVIEWER_RATE_STREAK_TYPE,
          streakWeeks: reviewerRateStreak.currentCount,
          evaluationRate: targetSnapshot.evaluationRate,
          weekStartDate: targetSnapshot.weekStartDate.toISOString(),
        },
      });
      awardIfCreated(created, definition.category);
    }
  }

  const calibratedEyeDefinition = definitionsBySlug.get('reviewer-calibrated-eye');
  const calibratedEyeCandidates = targetSnapshots
    .map((snapshot) => ({
      snapshot,
      totalEvaluationsSubmitted: (snapshotsByUser.get(snapshot.userId) ?? []).reduce(
        (sum, item) => sum + item.evaluationsSubmitted,
        0
      ),
    }))
    .filter((entry) => entry.totalEvaluationsSubmitted >= 50);

  if (calibratedEyeDefinition && calibratedEyeCandidates.length > 0) {
    const reviewerIds = calibratedEyeCandidates.map((entry) => entry.snapshot.userId);
    const evaluations = await db.evaluation.findMany({
      where: {
        reviewerId: { in: reviewerIds },
        submittedAt: { lte: calibratedEyeCandidates[0].snapshot.weekEndDate },
      },
      select: {
        reviewerId: true,
        scores: {
          select: {
            dimensionId: true,
            score: true,
          },
        },
        reviewCycle: {
          select: {
            evaluations: {
              select: {
                reviewerId: true,
                scores: {
                  select: {
                    dimensionId: true,
                    score: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const evaluationsByReviewer = new Map<string, typeof evaluations>();
    for (const evaluation of evaluations) {
      const existing = evaluationsByReviewer.get(evaluation.reviewerId) ?? [];
      existing.push(evaluation);
      evaluationsByReviewer.set(evaluation.reviewerId, existing);
    }

    for (const candidate of calibratedEyeCandidates) {
      const reviewerEvaluations = evaluationsByReviewer.get(candidate.snapshot.userId) ?? [];
      let evaluableCount = 0;
      let consensusAlignedCount = 0;

      for (const evaluation of reviewerEvaluations) {
        const ownAverage = evaluateSingleAverage(evaluation.scores);
        const peerScores = evaluation.reviewCycle.evaluations
          .filter((peerEvaluation) => peerEvaluation.reviewerId !== candidate.snapshot.userId)
          .flatMap((peerEvaluation) => peerEvaluation.scores);
        const peerAverage = evaluateSingleAverage(peerScores);

        if (ownAverage === null || peerAverage === null) {
          continue;
        }

        evaluableCount += 1;
        if (Math.abs(ownAverage - peerAverage) <= 0.5) {
          consensusAlignedCount += 1;
        }
      }

      if (evaluableCount < 50 || consensusAlignedCount / evaluableCount < 0.8) {
        continue;
      }

      const created = await createOneTimeBadgeAward(db, {
        userId: candidate.snapshot.userId,
        definition: calibratedEyeDefinition,
        snapshotId: candidate.snapshot.id,
        awardedAt: new Date(candidate.snapshot.weekEndDate),
        metadata: {
          family: 'reviewer_consensus',
          evaluableCount,
          consensusAlignedCount,
          alignmentRate: consensusAlignedCount / evaluableCount,
          weekStartDate: candidate.snapshot.weekStartDate.toISOString(),
        },
      });

      if (created) {
        awardsCreated += 1;
        createdByCategory.set(
          calibratedEyeDefinition.category,
          (createdByCategory.get(calibratedEyeDefinition.category) ?? 0) + 1
        );
      }
    }
  }

  return {
    weekStartDate: params.weekStartDate,
    usersEvaluated: targetSnapshots.length,
    awardsCreated,
    streaksUpdated,
    createdByCategory: Object.fromEntries(createdByCategory.entries()),
  };
}
