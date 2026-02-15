import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import {
  buildCycleAggregateSummary,
  getApplicableReviewDimensionsForCard,
  requireQualitySummaryAccess,
  REVIEW_DIMENSION_INCLUDE,
  toRoundedNumber,
  toWeekStartKey,
} from '@/lib/quality-review-api';
import {
  aggregateDimensionScores,
  computeOverallAverage,
  qualityTierFromAverage,
  type QualityTier,
} from '@/lib/quality-review';

function scoreLabelFromAverage(
  average: number | null
): 'LOW' | 'MEDIUM' | 'HIGH' | null {
  if (average === null) return null;
  if (average >= 2.5) return 'HIGH';
  if (average >= 1.5) return 'MEDIUM';
  return 'LOW';
}

// GET /api/metrics/projects/[projectId]/quality-summary
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: qualityAccessResponse } = await requireQualitySummaryAccess(
      prisma,
      session.user.id
    );
    if (qualityAccessResponse) return qualityAccessResponse;

    const { projectId } = await params;

    const project = await prisma.board.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!project) {
      return ApiErrors.notFound('Project');
    }

    const [allActiveDimensions, doneTasks, finalCycles] = await Promise.all([
      prisma.reviewDimension.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          position: 'asc',
        },
        include: {
          ...REVIEW_DIMENSION_INCLUDE,
        },
      }),
      prisma.card.findMany({
        where: {
          archivedAt: null,
          type: 'TASK',
          list: {
            boardId: projectId,
            phase: 'DONE',
          },
        },
        select: {
          id: true,
          title: true,
          updatedAt: true,
        },
      }),
      prisma.reviewCycle.findMany({
        where: {
          isFinal: true,
          lockedAt: {
            not: null,
          },
          card: {
            archivedAt: null,
            list: {
              boardId: projectId,
            },
          },
        },
        orderBy: {
          lockedAt: 'asc',
        },
        select: {
          id: true,
          cycleNumber: true,
          openedAt: true,
          closedAt: true,
          isFinal: true,
          lockedAt: true,
          cardId: true,
          card: {
            select: {
              id: true,
              title: true,
              type: true,
              taskData: true,
              list: {
                select: {
                  id: true,
                  name: true,
                  phase: true,
                  viewType: true,
                  boardId: true,
                },
              },
            },
          },
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
      }),
    ]);

    const cycleSummaries = [] as Array<{
      cycleId: string;
      cardId: string;
      cardTitle: string;
      finalizedAt: Date;
      cycleNumber: number;
      overallAverage: number | null;
      qualityTier: QualityTier;
    }>;

    for (const finalCycle of finalCycles) {
      const applicableDimensions = await getApplicableReviewDimensionsForCard(
        prisma,
        finalCycle.card,
        undefined,
        allActiveDimensions
      );

      const summary = buildCycleAggregateSummary({
        cycle: finalCycle,
        dimensions: applicableDimensions,
      });

      cycleSummaries.push({
        cycleId: summary.cycleId,
        cardId: finalCycle.card.id,
        cardTitle: finalCycle.card.title,
        finalizedAt: finalCycle.lockedAt ?? finalCycle.closedAt ?? finalCycle.openedAt,
        cycleNumber: summary.cycleNumber,
        overallAverage: summary.overallAverage,
        qualityTier: summary.qualityTier,
      });
    }

    const qualityTierByCardId = new Map(
      cycleSummaries.map((summary) => [summary.cardId, summary.qualityTier])
    );

    const tierDistribution = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      UNSCORED: 0,
    };

    for (const task of doneTasks) {
      const tier = qualityTierByCardId.get(task.id) ?? 'UNSCORED';
      tierDistribution[tier] += 1;
    }

    const trendBuckets = new Map<
      string,
      {
        sum: number;
        count: number;
        high: number;
        medium: number;
        low: number;
        unscored: number;
      }
    >();

    for (const summary of cycleSummaries) {
      const weekStart = toWeekStartKey(summary.finalizedAt);
      const bucket = trendBuckets.get(weekStart) ?? {
        sum: 0,
        count: 0,
        high: 0,
        medium: 0,
        low: 0,
        unscored: 0,
      };

      if (summary.overallAverage !== null) {
        bucket.sum += summary.overallAverage;
        bucket.count += 1;
      }

      if (summary.qualityTier === 'HIGH') bucket.high += 1;
      if (summary.qualityTier === 'MEDIUM') bucket.medium += 1;
      if (summary.qualityTier === 'LOW') bucket.low += 1;
      if (summary.qualityTier === 'UNSCORED') bucket.unscored += 1;

      trendBuckets.set(weekStart, bucket);
    }

    const trend = Array.from(trendBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, bucket]) => ({
        weekStart,
        averageQuality: bucket.count > 0 ? toRoundedNumber(bucket.sum / bucket.count) : null,
        sampleSize: bucket.count,
        tierCounts: {
          HIGH: bucket.high,
          MEDIUM: bucket.medium,
          LOW: bucket.low,
          UNSCORED: bucket.unscored,
        },
      }));

    const allFinalScores = finalCycles.flatMap((cycle) =>
      cycle.evaluations.flatMap((evaluation) =>
        evaluation.scores.map((score) => ({
          dimensionId: score.dimensionId,
          score: score.score,
        }))
      )
    );

    const perDimensionAggregatesById = new Map(
      aggregateDimensionScores(allFinalScores).map((aggregate) => [aggregate.dimensionId, aggregate])
    );

    const perDimension = allActiveDimensions.map((dimension) => {
      const aggregate = perDimensionAggregatesById.get(dimension.id);
      const average = aggregate?.average ?? null;
      const count = aggregate?.count ?? 0;

      return {
        dimensionId: dimension.id,
        name: dimension.name,
        description: dimension.description,
        position: dimension.position,
        average: toRoundedNumber(average),
        scoreLabel: scoreLabelFromAverage(average),
        count,
        confidence: aggregate?.confidence ?? 'RED',
      };
    });

    const overallAverage = computeOverallAverage(
      cycleSummaries.map((summary) => ({
        average: summary.overallAverage,
      }))
    );

    const finalizedTaskCount = cycleSummaries.length;
    const totalCycles = cycleSummaries.reduce((sum, summary) => sum + summary.cycleNumber, 0);
    const highChurnCount = cycleSummaries.filter((summary) => summary.cycleNumber >= 3).length;

    return apiSuccess({
      project: {
        id: project.id,
        name: project.name,
      },
      totals: {
        doneTaskCount: doneTasks.length,
        finalizedTaskCount,
        overallAverage: toRoundedNumber(overallAverage),
        overallQualityTier: qualityTierFromAverage(overallAverage),
      },
      tierDistribution,
      trend,
      perDimension,
      iterationMetrics: {
        averageCyclesToDone:
          finalizedTaskCount > 0 ? toRoundedNumber(totalCycles / finalizedTaskCount) : null,
        highChurnThreshold: 3,
        highChurnCount,
        highChurnRate:
          finalizedTaskCount > 0
            ? toRoundedNumber((highChurnCount / finalizedTaskCount) * 100)
            : null,
      },
    });
  } catch (error) {
    console.error('Failed to fetch project quality summary:', error);
    return ApiErrors.internal('Failed to fetch project quality summary');
  }
}
