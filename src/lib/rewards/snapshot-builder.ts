import type { Prisma, PrismaClient, Seniority } from '@prisma/client';
import { aggregateDimensionScores, computeOverallAverage } from '@/lib/quality-review';
import { getStoryPointsFromTaskData } from '@/lib/quality-metrics';
import { resolveApprovers } from '@/lib/role-utils';

type RewardsDbClient = PrismaClient | Prisma.TransactionClient;

export interface WeeklySnapshotBuildResult {
  weekStartDate: Date;
  weekEndDate: Date;
  createdCount: number;
  skippedExistingCount: number;
  warnings: {
    zeroAssigneeTasks: number;
    multiAssigneeTasks: number;
  };
}

function normalizeDimensionName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

export function toWeekStartDate(date: Date): Date {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  utcDate.setUTCDate(utcDate.getUTCDate() + offsetToMonday);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toWeekEndDate(weekStartDate: Date): Date {
  const nextWeekStart = addDays(weekStartDate, 7);
  return new Date(nextWeekStart.getTime() - 1);
}

function resolveDimensionBucket(
  dimensionName: string
): 'technical' | 'artDirection' | 'contextFit' | 'delivery' | null {
  const normalized = normalizeDimensionName(dimensionName);

  if (normalized.includes('technical')) return 'technical';
  if (normalized.includes('art direction')) return 'artDirection';
  if (normalized.includes('context')) return 'contextFit';
  if (normalized.includes('delivery')) return 'delivery';
  return null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function resolveSnapshotWeekRange(referenceDate?: Date): {
  weekStartDate: Date;
  weekEndDate: Date;
} {
  const now = referenceDate ?? new Date();
  const currentWeekStart = toWeekStartDate(now);
  const weekStartDate = addDays(currentWeekStart, -7);
  const weekEndDate = toWeekEndDate(weekStartDate);
  return { weekStartDate, weekEndDate };
}

export async function buildWeeklySnapshots(
  db: RewardsDbClient,
  params?: {
    weekStartDate?: Date;
    userIds?: string[];
  }
): Promise<WeeklySnapshotBuildResult> {
  const range = params?.weekStartDate
    ? {
        weekStartDate: toWeekStartDate(params.weekStartDate),
        weekEndDate: toWeekEndDate(toWeekStartDate(params.weekStartDate)),
      }
    : resolveSnapshotWeekRange();

  const nextWeekStart = addDays(range.weekStartDate, 7);

  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      ...(params?.userIds?.length ? { id: { in: params.userIds } } : {}),
    },
    select: {
      id: true,
      seniority: true,
    },
  });

  const existingSnapshots = await db.weeklySnapshot.findMany({
    where: {
      weekStartDate: range.weekStartDate,
      userId: {
        in: users.map((user) => user.id),
      },
    },
    select: {
      userId: true,
    },
  });

  const existingUserIds = new Set(existingSnapshots.map((snapshot) => snapshot.userId));
  const usersToBuild = users.filter((user) => !existingUserIds.has(user.id));

  const completedTasks = await db.card.findMany({
    where: {
      type: 'TASK',
      completedAt: {
        gte: range.weekStartDate,
        lt: nextWeekStart,
      },
    },
    select: {
      id: true,
      completedAt: true,
      taskData: true,
      assignees: {
        select: {
          userId: true,
          activatedAt: true,
        },
      },
      reviewCycles: {
        select: {
          id: true,
          isFinal: true,
          evaluations: {
            select: {
              scores: {
                select: {
                  dimensionId: true,
                  score: true,
                  dimension: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const evaluations = await db.evaluation.findMany({
    where: {
      submittedAt: {
        gte: range.weekStartDate,
        lt: nextWeekStart,
      },
    },
    select: {
      reviewerId: true,
    },
  });

  const reviewEligibilityCycles = await db.reviewCycle.findMany({
    where: {
      openedAt: {
        gte: range.weekStartDate,
        lt: nextWeekStart,
      },
    },
    select: {
      card: {
        select: {
          list: {
            select: {
              board: {
                select: {
                  settings: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const metricsByUserId = new Map<
    string,
    {
      seniority: Seniority | null;
      storyPointsCompleted: number;
      cardsCompleted: number;
      scoredCardCount: number;
      overallQualityAverages: number[];
      avgTechnicalQuality: number[];
      avgArtDirection: number[];
      avgContextFit: number[];
      avgDelivery: number[];
      firstPassCount: number;
      reviewedCardsCount: number;
      reviewCycleCounts: number[];
      evaluationsSubmitted: number;
      evaluationEligible: number;
    }
  >();

  for (const user of usersToBuild) {
    metricsByUserId.set(user.id, {
      seniority: user.seniority,
      storyPointsCompleted: 0,
      cardsCompleted: 0,
      scoredCardCount: 0,
      overallQualityAverages: [],
      avgTechnicalQuality: [],
      avgArtDirection: [],
      avgContextFit: [],
      avgDelivery: [],
      firstPassCount: 0,
      reviewedCardsCount: 0,
      reviewCycleCounts: [],
      evaluationsSubmitted: 0,
      evaluationEligible: 0,
    });
  }

  let zeroAssigneeTasks = 0;
  let multiAssigneeTasks = 0;

  for (const task of completedTasks) {
    const activeAssignees = task.assignees.filter((assignee) => assignee.activatedAt !== null);
    const effectiveAssignees = activeAssignees.length > 0 ? activeAssignees : task.assignees;

    if (effectiveAssignees.length === 0) {
      zeroAssigneeTasks += 1;
      continue;
    }

    if (effectiveAssignees.length > 1) {
      multiAssigneeTasks += 1;
      continue;
    }

    const userMetrics = metricsByUserId.get(effectiveAssignees[0].userId);
    if (!userMetrics) continue;

    userMetrics.cardsCompleted += 1;
    userMetrics.storyPointsCompleted += getStoryPointsFromTaskData(task.taskData);

    const reviewCycleCount = task.reviewCycles.length;
    if (reviewCycleCount > 0) {
      userMetrics.reviewedCardsCount += 1;
      userMetrics.reviewCycleCounts.push(reviewCycleCount);
      if (reviewCycleCount === 1) {
        userMetrics.firstPassCount += 1;
      }
    }

    const finalCycle = task.reviewCycles.find((cycle) => cycle.isFinal);
    if (!finalCycle) {
      continue;
    }

    const allScores = finalCycle.evaluations.flatMap((evaluation) =>
      evaluation.scores.map((score) => ({
        dimensionId: score.dimensionId,
        score: score.score,
      }))
    );

    const aggregatedScores = aggregateDimensionScores(allScores);
    const overallAverage = computeOverallAverage(
      aggregatedScores.map((aggregate) => ({ average: aggregate.average }))
    );

    if (overallAverage !== null) {
      userMetrics.overallQualityAverages.push(overallAverage);
      userMetrics.scoredCardCount += 1;
    }

    for (const aggregate of aggregatedScores) {
      if (aggregate.average === null) continue;

      const scoreName = finalCycle.evaluations
        .flatMap((evaluation) => evaluation.scores)
        .find((score) => score.dimensionId === aggregate.dimensionId)?.dimension.name;

      if (!scoreName) continue;

      const bucket = resolveDimensionBucket(scoreName);
      if (bucket === 'technical') userMetrics.avgTechnicalQuality.push(aggregate.average);
      if (bucket === 'artDirection') userMetrics.avgArtDirection.push(aggregate.average);
      if (bucket === 'contextFit') userMetrics.avgContextFit.push(aggregate.average);
      if (bucket === 'delivery') userMetrics.avgDelivery.push(aggregate.average);
    }
  }

  for (const evaluation of evaluations) {
    const userMetrics = metricsByUserId.get(evaluation.reviewerId);
    if (!userMetrics) continue;
    userMetrics.evaluationsSubmitted += 1;
  }

  for (const cycle of reviewEligibilityCycles) {
    const boardSettings = cycle.card.list.board.settings as Record<string, unknown> | null;
    const projectRoleAssignments = Array.isArray(boardSettings?.projectRoleAssignments)
      ? boardSettings.projectRoleAssignments
      : [];

    const eligibleReviewerIds = new Set(
      resolveApprovers(projectRoleAssignments as NonNullable<Parameters<typeof resolveApprovers>[0]>)
        .map((approver) => approver.userId)
    );

    for (const reviewerId of eligibleReviewerIds) {
      const userMetrics = metricsByUserId.get(reviewerId);
      if (!userMetrics) continue;
      userMetrics.evaluationEligible += 1;
    }
  }

  const snapshotsToCreate = usersToBuild.map((user) => {
    const metrics = metricsByUserId.get(user.id)!;
    const avgReviewCycles = average(metrics.reviewCycleCounts);
    const firstPassRate =
      metrics.reviewedCardsCount > 0
        ? metrics.firstPassCount / metrics.reviewedCardsCount
        : null;
    const evaluationRate =
      metrics.evaluationEligible > 0
        ? metrics.evaluationsSubmitted / metrics.evaluationEligible
        : null;

    return {
      userId: user.id,
      weekStartDate: range.weekStartDate,
      weekEndDate: range.weekEndDate,
      seniorityAtSnapshot: metrics.seniority,
      storyPointsCompleted: metrics.storyPointsCompleted,
      cardsCompleted: metrics.cardsCompleted,
      avgQualityScore: average(metrics.overallQualityAverages),
      avgTechnicalQuality: average(metrics.avgTechnicalQuality),
      avgArtDirection: average(metrics.avgArtDirection),
      avgContextFit: average(metrics.avgContextFit),
      avgDelivery: average(metrics.avgDelivery),
      scoredCardCount: metrics.scoredCardCount,
      firstPassCount: metrics.firstPassCount,
      firstPassRate,
      avgReviewCycles,
      evaluationsSubmitted: metrics.evaluationsSubmitted,
      evaluationEligible: metrics.evaluationEligible,
      evaluationRate,
    };
  });

  if (snapshotsToCreate.length > 0) {
    await db.weeklySnapshot.createMany({
      data: snapshotsToCreate,
      skipDuplicates: true,
    });
  }

  return {
    weekStartDate: range.weekStartDate,
    weekEndDate: range.weekEndDate,
    createdCount: snapshotsToCreate.length,
    skippedExistingCount: existingUserIds.size,
    warnings: {
      zeroAssigneeTasks,
      multiAssigneeTasks,
    },
  };
}
