import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import {
  requireQualitySummaryAccess,
  toRoundedNumber,
  toWeekStartKey,
  VELOCITY_DEFAULT_MULTIPLIERS,
} from '@/lib/quality-review-api';
import { buildFinalQualitySummaryByCardId, getStoryPointsFromTaskData } from '@/lib/quality-metrics';

// GET /api/metrics/quality-adjusted-velocity
// Optional filters:
// - projectId (board id)
// - boardId (alias of projectId)
export async function GET(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: qualityAccessResponse } = await requireQualitySummaryAccess(
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
      },
    });

    const finalQualityByCardId = await buildFinalQualitySummaryByCardId(
      prisma,
      doneTasks.map((task) => task.id)
    );

    const weeklyBuckets = new Map<
      string,
      {
        taskCount: number;
        scoredTaskCount: number;
        rawPoints: number;
        adjustedPoints: number;
      }
    >();

    for (const task of doneTasks) {
      const weekStart = toWeekStartKey(task.updatedAt);
      const storyPoints = getStoryPointsFromTaskData(task.taskData);
      const finalQuality = finalQualityByCardId.get(task.id) ?? {
        overallAverage: null,
        qualityTier: 'UNSCORED' as const,
      };

      const bucket = weeklyBuckets.get(weekStart) ?? {
        taskCount: 0,
        scoredTaskCount: 0,
        rawPoints: 0,
        adjustedPoints: 0,
      };

      bucket.taskCount += 1;
      if (finalQuality.overallAverage !== null) {
        bucket.scoredTaskCount += 1;
      }

      bucket.rawPoints += storyPoints;
      bucket.adjustedPoints += storyPoints * VELOCITY_DEFAULT_MULTIPLIERS[finalQuality.qualityTier];

      weeklyBuckets.set(weekStart, bucket);
    }

    const sortedWeeks = Array.from(weeklyBuckets.keys()).sort();
    let cumulativeRawPoints = 0;
    let cumulativeAdjustedPoints = 0;
    let cumulativeTaskCount = 0;
    let cumulativeScoredTaskCount = 0;

    const series = sortedWeeks.map((weekStart) => {
      const bucket = weeklyBuckets.get(weekStart)!;

      cumulativeRawPoints += bucket.rawPoints;
      cumulativeAdjustedPoints += bucket.adjustedPoints;
      cumulativeTaskCount += bucket.taskCount;
      cumulativeScoredTaskCount += bucket.scoredTaskCount;

      return {
        weekStart,
        perWeek: {
          taskCount: bucket.taskCount,
          scoredTaskCount: bucket.scoredTaskCount,
          rawPoints: toRoundedNumber(bucket.rawPoints),
          adjustedPoints: toRoundedNumber(bucket.adjustedPoints),
          adjustmentDelta: toRoundedNumber(bucket.adjustedPoints - bucket.rawPoints),
          adjustmentFactor:
            bucket.rawPoints > 0
              ? toRoundedNumber(bucket.adjustedPoints / bucket.rawPoints, 3)
              : null,
        },
        cumulative: {
          taskCount: cumulativeTaskCount,
          scoredTaskCount: cumulativeScoredTaskCount,
          rawPoints: toRoundedNumber(cumulativeRawPoints),
          adjustedPoints: toRoundedNumber(cumulativeAdjustedPoints),
          adjustmentDelta: toRoundedNumber(cumulativeAdjustedPoints - cumulativeRawPoints),
          adjustmentFactor:
            cumulativeRawPoints > 0
              ? toRoundedNumber(cumulativeAdjustedPoints / cumulativeRawPoints, 3)
              : null,
        },
      };
    });

    const scoredTaskCount = Array.from(finalQualityByCardId.values()).filter(
      (summary) => summary.overallAverage !== null
    ).length;

    return apiSuccess({
      projectId,
      multipliers: VELOCITY_DEFAULT_MULTIPLIERS,
      totals: {
        doneTaskCount: doneTasks.length,
        scoredTaskCount,
        totalRawPoints: toRoundedNumber(cumulativeRawPoints),
        totalAdjustedPoints: toRoundedNumber(cumulativeAdjustedPoints),
        totalAdjustmentDelta: toRoundedNumber(cumulativeAdjustedPoints - cumulativeRawPoints),
        overallAdjustmentFactor:
          cumulativeRawPoints > 0
            ? toRoundedNumber(cumulativeAdjustedPoints / cumulativeRawPoints, 3)
            : null,
      },
      series,
    });
  } catch (error) {
    console.error('Failed to fetch quality-adjusted velocity metrics:', error);
    return ApiErrors.internal('Failed to fetch quality-adjusted velocity metrics');
  }
}
