import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import {
  requireNonViewerQualityAccess,
  toRoundedNumber,
  toWeekStartKey,
  VELOCITY_DEFAULT_MULTIPLIERS,
} from '@/lib/quality-review-api';
import {
  aggregateDimensionScores,
  computeOverallAverage,
  qualityTierFromAverage,
  type QualityTier,
} from '@/lib/quality-review';

function getStoryPoints(taskData: unknown): number {
  if (!taskData || typeof taskData !== 'object' || Array.isArray(taskData)) {
    return 0;
  }

  const storyPoints = (taskData as Record<string, unknown>).storyPoints;
  if (typeof storyPoints !== 'number' || Number.isNaN(storyPoints)) {
    return 0;
  }

  return Math.max(0, storyPoints);
}

// GET /api/metrics/velocity
// Optional filters:
// - projectId (board id)
// - boardId (alias of projectId)
export async function GET(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: qualityAccessResponse } = await requireNonViewerQualityAccess(
      prisma,
      session.user.id
    );
    if (qualityAccessResponse) return qualityAccessResponse;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || searchParams.get('boardId');

    const doneTasks = await prisma.card.findMany({
      where: {
        archivedAt: null,
        type: 'TASK',
        list: {
          phase: 'DONE',
          ...(projectId ? { boardId: projectId } : {}),
        },
      },
      select: {
        id: true,
        updatedAt: true,
        taskData: true,
        list: {
          select: {
            boardId: true,
          },
        },
      },
    });

    const finalCycles = await prisma.reviewCycle.findMany({
      where: {
        isFinal: true,
        cardId: {
          in: doneTasks.map((task) => task.id),
        },
      },
      select: {
        cardId: true,
        evaluations: {
          select: {
            scores: {
              select: {
                dimensionId: true,
                score: true,
              },
            },
          },
        },
      },
    });

    const qualityTierByCardId = new Map<string, QualityTier>();

    for (const finalCycle of finalCycles) {
      const scoreInputs = finalCycle.evaluations.flatMap((evaluation) =>
        evaluation.scores.map((score) => ({
          dimensionId: score.dimensionId,
          score: score.score,
        }))
      );

      const overallAverage = computeOverallAverage(
        aggregateDimensionScores(scoreInputs).map((aggregate) => ({
          average: aggregate.average,
        }))
      );

      qualityTierByCardId.set(finalCycle.cardId, qualityTierFromAverage(overallAverage));
    }

    const weeklyBuckets = new Map<
      string,
      {
        highPoints: number;
        mediumPoints: number;
        lowPoints: number;
        unscoredPoints: number;
        rawPoints: number;
        adjustedPoints: number;
      }
    >();

    for (const task of doneTasks) {
      const weekStart = toWeekStartKey(task.updatedAt);
      const qualityTier = qualityTierByCardId.get(task.id) ?? 'UNSCORED';
      const storyPoints = getStoryPoints(task.taskData);

      const bucket = weeklyBuckets.get(weekStart) ?? {
        highPoints: 0,
        mediumPoints: 0,
        lowPoints: 0,
        unscoredPoints: 0,
        rawPoints: 0,
        adjustedPoints: 0,
      };

      if (qualityTier === 'HIGH') bucket.highPoints += storyPoints;
      if (qualityTier === 'MEDIUM') bucket.mediumPoints += storyPoints;
      if (qualityTier === 'LOW') bucket.lowPoints += storyPoints;
      if (qualityTier === 'UNSCORED') bucket.unscoredPoints += storyPoints;

      bucket.rawPoints += storyPoints;
      bucket.adjustedPoints += storyPoints * VELOCITY_DEFAULT_MULTIPLIERS[qualityTier];

      weeklyBuckets.set(weekStart, bucket);
    }

    const sortedWeeks = Array.from(weeklyBuckets.keys()).sort();

    let cumulativeHigh = 0;
    let cumulativeMedium = 0;
    let cumulativeLow = 0;
    let cumulativeUnscored = 0;
    let cumulativeRaw = 0;
    let cumulativeAdjusted = 0;

    const series = sortedWeeks.map((weekStart) => {
      const bucket = weeklyBuckets.get(weekStart)!;

      cumulativeHigh += bucket.highPoints;
      cumulativeMedium += bucket.mediumPoints;
      cumulativeLow += bucket.lowPoints;
      cumulativeUnscored += bucket.unscoredPoints;
      cumulativeRaw += bucket.rawPoints;
      cumulativeAdjusted += bucket.adjustedPoints;

      return {
        weekStart,
        perWeek: {
          highPoints: toRoundedNumber(bucket.highPoints),
          mediumPoints: toRoundedNumber(bucket.mediumPoints),
          lowPoints: toRoundedNumber(bucket.lowPoints),
          unscoredPoints: toRoundedNumber(bucket.unscoredPoints),
          rawPoints: toRoundedNumber(bucket.rawPoints),
          adjustedPoints: toRoundedNumber(bucket.adjustedPoints),
        },
        cumulative: {
          highPoints: toRoundedNumber(cumulativeHigh),
          mediumPoints: toRoundedNumber(cumulativeMedium),
          lowPoints: toRoundedNumber(cumulativeLow),
          unscoredPoints: toRoundedNumber(cumulativeUnscored),
          rawPoints: toRoundedNumber(cumulativeRaw),
          adjustedPoints: toRoundedNumber(cumulativeAdjusted),
        },
      };
    });

    return apiSuccess({
      projectId,
      multipliers: VELOCITY_DEFAULT_MULTIPLIERS,
      totals: {
        doneTaskCount: doneTasks.length,
        finalScoredTaskCount: finalCycles.length,
        totalRawPoints: toRoundedNumber(cumulativeRaw),
        totalAdjustedPoints: toRoundedNumber(cumulativeAdjusted),
      },
      series,
    });
  } catch (error) {
    console.error('Failed to fetch velocity metrics:', error);
    return ApiErrors.internal('Failed to fetch velocity metrics');
  }
}
