import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { requireQualitySummaryAccess, toRoundedNumber } from '@/lib/quality-review-api';
import { qualityTierFromAverage, type QualityTier } from '@/lib/quality-review';
import {
  buildFinalQualitySummaryByCardId,
  getStoryPointsFromTaskData,
} from '@/lib/quality-metrics';

const HIGH_CHURN_THRESHOLD = 3;

// GET /api/metrics/iteration-distribution
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
        taskData: true,
      },
    });

    const doneTaskIds = doneTasks.map((task) => task.id);

    const [cycleStats, finalQualityByCardId] = await Promise.all([
      doneTaskIds.length
        ? prisma.reviewCycle.groupBy({
            by: ['cardId'],
            where: {
              cardId: {
                in: doneTaskIds,
              },
            },
            _max: {
              cycleNumber: true,
            },
          })
        : Promise.resolve([]),
      buildFinalQualitySummaryByCardId(prisma, doneTaskIds),
    ]);

    const cycleCountByCardId = new Map(
      cycleStats.map((row) => [row.cardId, row._max.cycleNumber ?? 0])
    );

    const distributionBuckets = new Map<
      number,
      {
        taskCount: number;
        scoredTaskCount: number;
        totalStoryPoints: number;
        qualitySum: number;
        qualityCount: number;
        tierDistribution: Record<QualityTier, number>;
      }
    >();

    let cycleTotal = 0;
    let withReviewCyclesCount = 0;
    let highChurnCount = 0;

    for (const task of doneTasks) {
      const cycleCount = cycleCountByCardId.get(task.id) ?? 0;
      const storyPoints = getStoryPointsFromTaskData(task.taskData);
      const finalQuality = finalQualityByCardId.get(task.id) ?? {
        overallAverage: null,
        qualityTier: 'UNSCORED' as const,
      };

      cycleTotal += cycleCount;
      if (cycleCount > 0) {
        withReviewCyclesCount += 1;
      }
      if (cycleCount >= HIGH_CHURN_THRESHOLD) {
        highChurnCount += 1;
      }

      const bucket = distributionBuckets.get(cycleCount) ?? {
        taskCount: 0,
        scoredTaskCount: 0,
        totalStoryPoints: 0,
        qualitySum: 0,
        qualityCount: 0,
        tierDistribution: {
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
          UNSCORED: 0,
        },
      };

      bucket.taskCount += 1;
      bucket.totalStoryPoints += storyPoints;
      bucket.tierDistribution[finalQuality.qualityTier] += 1;

      if (finalQuality.overallAverage !== null) {
        bucket.scoredTaskCount += 1;
        bucket.qualityCount += 1;
        bucket.qualitySum += finalQuality.overallAverage;
      }

      distributionBuckets.set(cycleCount, bucket);
    }

    const distribution = Array.from(distributionBuckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([cycleCount, bucket]) => {
        const averageQuality =
          bucket.qualityCount > 0 ? bucket.qualitySum / bucket.qualityCount : null;

        return {
          cycleCount,
          taskCount: bucket.taskCount,
          percentage:
            doneTasks.length > 0
              ? toRoundedNumber((bucket.taskCount / doneTasks.length) * 100)
              : null,
          scoredTaskCount: bucket.scoredTaskCount,
          averageQuality: toRoundedNumber(averageQuality),
          qualityTier: qualityTierFromAverage(averageQuality),
          totalStoryPoints: toRoundedNumber(bucket.totalStoryPoints),
          tierDistribution: bucket.tierDistribution,
        };
      });

    const scoredTaskCount = Array.from(finalQualityByCardId.values()).filter(
      (summary) => summary.overallAverage !== null
    ).length;

    return apiSuccess({
      projectId,
      totals: {
        doneTaskCount: doneTasks.length,
        scoredTaskCount,
        withReviewCyclesCount,
        withoutReviewCyclesCount: doneTasks.length - withReviewCyclesCount,
        averageCyclesToDone:
          doneTasks.length > 0 ? toRoundedNumber(cycleTotal / doneTasks.length) : null,
        highChurnThreshold: HIGH_CHURN_THRESHOLD,
        highChurnCount,
        highChurnRate:
          doneTasks.length > 0
            ? toRoundedNumber((highChurnCount / doneTasks.length) * 100)
            : null,
      },
      distribution,
      correlation: distribution.map((bucket) => ({
        cycleCount: bucket.cycleCount,
        averageQuality: bucket.averageQuality,
        sampleSize: bucket.taskCount,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch iteration distribution metrics:', error);
    return ApiErrors.internal('Failed to fetch iteration distribution metrics');
  }
}
