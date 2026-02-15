import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import {
  buildCycleAggregateSummary,
  getApplicableReviewDimensionsForCard,
  requireQualitySummaryAccess,
  toRoundedNumber,
  toWeekStartKey,
} from '@/lib/quality-review-api';
import {
  aggregateDimensionScores,
  computeOverallAverage,
  qualityTierFromAverage,
} from '@/lib/quality-review';

function scoreLabelFromAverage(
  average: number | null
): 'LOW' | 'MEDIUM' | 'HIGH' | null {
  if (average === null) return null;
  if (average >= 2.5) return 'HIGH';
  if (average >= 1.5) return 'MEDIUM';
  return 'LOW';
}

// GET /api/metrics/users/[userId]/quality-summary
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: qualityAccessResponse } = await requireQualitySummaryAccess(
      prisma,
      session.user.id
    );
    if (qualityAccessResponse) return qualityAccessResponse;

    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return ApiErrors.notFound('User');
    }

    const [allActiveDimensions, finalCycles] = await Promise.all([
      prisma.reviewDimension.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          position: 'asc',
        },
        select: {
          id: true,
          name: true,
          description: true,
          position: true,
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
            assignees: {
              some: {
                userId,
              },
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
                  board: {
                    select: {
                      name: true,
                    },
                  },
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
      boardId: string;
      boardName: string;
      finalizedAt: Date;
      cycleNumber: number;
      overallAverage: number | null;
      qualityTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';
    }>;

    for (const finalCycle of finalCycles) {
      const applicableDimensions = await getApplicableReviewDimensionsForCard(
        prisma,
        finalCycle.card
      );

      const summary = buildCycleAggregateSummary({
        cycle: finalCycle,
        dimensions: applicableDimensions,
      });

      cycleSummaries.push({
        cycleId: summary.cycleId,
        cardId: finalCycle.card.id,
        cardTitle: finalCycle.card.title,
        boardId: finalCycle.card.list.boardId,
        boardName: finalCycle.card.list.board.name,
        finalizedAt: finalCycle.lockedAt ?? finalCycle.closedAt ?? finalCycle.openedAt,
        cycleNumber: summary.cycleNumber,
        overallAverage: summary.overallAverage,
        qualityTier: summary.qualityTier,
      });
    }

    const allFinalScores = finalCycles.flatMap((cycle) =>
      cycle.evaluations.flatMap((evaluation) =>
        evaluation.scores.map((score) => ({
          dimensionId: score.dimensionId,
          score: score.score,
        }))
      )
    );

    const aggregatesByDimensionId = new Map(
      aggregateDimensionScores(allFinalScores).map((aggregate) => [aggregate.dimensionId, aggregate])
    );

    const perDimension = allActiveDimensions.map((dimension) => {
      const aggregate = aggregatesByDimensionId.get(dimension.id);
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

    const progression = cycleSummaries
      .slice()
      .sort((a, b) => a.finalizedAt.getTime() - b.finalizedAt.getTime())
      .map((summary) => ({
        cycleId: summary.cycleId,
        cardId: summary.cardId,
        cardTitle: summary.cardTitle,
        boardId: summary.boardId,
        boardName: summary.boardName,
        cycleNumber: summary.cycleNumber,
        finalizedAt: summary.finalizedAt,
        weekStart: toWeekStartKey(summary.finalizedAt),
        overallAverage: toRoundedNumber(summary.overallAverage),
        qualityTier: summary.qualityTier,
      }));

    const latestFinalizedTasks = cycleSummaries
      .slice()
      .sort((a, b) => b.finalizedAt.getTime() - a.finalizedAt.getTime())
      .slice(0, 20)
      .map((summary) => ({
        cycleId: summary.cycleId,
        cardId: summary.cardId,
        cardTitle: summary.cardTitle,
        boardId: summary.boardId,
        boardName: summary.boardName,
        finalizedAt: summary.finalizedAt,
        overallAverage: toRoundedNumber(summary.overallAverage),
        qualityTier: summary.qualityTier,
      }));

    return apiSuccess({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      totals: {
        finalizedTaskCount: cycleSummaries.length,
        overallAverage: toRoundedNumber(overallAverage),
        overallQualityTier: qualityTierFromAverage(overallAverage),
      },
      progression,
      perDimension,
      latestFinalizedTasks,
    });
  } catch (error) {
    console.error('Failed to fetch user quality summary:', error);
    return ApiErrors.internal('Failed to fetch user quality summary');
  }
}
