import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import {
  buildCycleAggregateSummary,
  getApplicableReviewDimensionsForCard,
  getReviewerRolesByUserIds,
  requireNonViewerQualityAccess,
  toRoundedNumber,
} from '@/lib/quality-review-api';

// GET /api/cycles/[cycleId]/evaluations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: qualityAccessResponse } = await requireNonViewerQualityAccess(
      prisma,
      session.user.id
    );
    if (qualityAccessResponse) return qualityAccessResponse;

    const { cycleId } = await params;

    const cycle = await prisma.reviewCycle.findUnique({
      where: {
        id: cycleId,
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
    });

    if (!cycle) {
      return ApiErrors.notFound('Review cycle');
    }

    const dimensions = await getApplicableReviewDimensionsForCard(prisma, cycle.card);
    const reviewerRolesByUserId = await getReviewerRolesByUserIds(
      prisma,
      cycle.evaluations.map((evaluation) => evaluation.reviewerId)
    );

    const aggregate = buildCycleAggregateSummary({
      cycle,
      dimensions,
      reviewerRolesByUserId,
    });

    return apiSuccess({
      cycle: {
        id: aggregate.cycleId,
        cycleNumber: aggregate.cycleNumber,
        openedAt: aggregate.openedAt,
        closedAt: aggregate.closedAt,
        isFinal: aggregate.isFinal,
        lockedAt: aggregate.lockedAt,
      },
      card: {
        id: cycle.card.id,
        title: cycle.card.title,
        boardId: cycle.card.list.boardId,
        listId: cycle.card.list.id,
        listName: cycle.card.list.name,
        listPhase: cycle.card.list.phase,
      },
      evaluationsCount: aggregate.evaluationsCount,
      overallAverage: toRoundedNumber(aggregate.overallAverage),
      qualityTier: aggregate.qualityTier,
      dimensions: aggregate.dimensions.map((dimension) => ({
        id: dimension.dimensionId,
        name: dimension.name,
        description: dimension.description,
        position: dimension.position,
        average: toRoundedNumber(dimension.average),
        scoreLabel: dimension.scoreLabel,
        count: dimension.count,
        confidence: dimension.confidence,
      })),
      divergenceFlags: aggregate.divergenceFlags.map((flag) => ({
        dimensionId: flag.dimensionId,
        dimensionName: flag.dimensionName,
        roleA: flag.roleA,
        roleB: flag.roleB,
        averageA: toRoundedNumber(flag.averageA),
        averageB: toRoundedNumber(flag.averageB),
        difference: toRoundedNumber(flag.difference),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch aggregated cycle evaluations:', error);
    return ApiErrors.internal('Failed to fetch cycle evaluations');
  }
}
