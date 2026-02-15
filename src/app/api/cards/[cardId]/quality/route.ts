import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import {
  buildCycleAggregateSummary,
  getApplicableReviewDimensionsForCard,
  getReviewerRolesByUserIds,
  requireNonViewerQualityAccess,
  toRoundedNumber,
  type CycleAggregateSummary,
} from '@/lib/quality-review-api';

function formatCycleSummary(summary: CycleAggregateSummary) {
  return {
    id: summary.cycleId,
    cycleNumber: summary.cycleNumber,
    openedAt: summary.openedAt,
    closedAt: summary.closedAt,
    isFinal: summary.isFinal,
    lockedAt: summary.lockedAt,
    evaluationsCount: summary.evaluationsCount,
    overallAverage: toRoundedNumber(summary.overallAverage),
    qualityTier: summary.qualityTier,
    dimensions: summary.dimensions.map((dimension) => ({
      dimensionId: dimension.dimensionId,
      name: dimension.name,
      description: dimension.description,
      position: dimension.position,
      average: toRoundedNumber(dimension.average),
      scoreLabel: dimension.scoreLabel,
      count: dimension.count,
      confidence: dimension.confidence,
    })),
    divergenceFlags: summary.divergenceFlags.map((flag) => ({
      dimensionId: flag.dimensionId,
      dimensionName: flag.dimensionName,
      roleA: flag.roleA,
      roleB: flag.roleB,
      averageA: toRoundedNumber(flag.averageA),
      averageB: toRoundedNumber(flag.averageB),
      difference: toRoundedNumber(flag.difference),
    })),
  };
}

// GET /api/cards/[cardId]/quality
export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: qualityAccessResponse } = await requireNonViewerQualityAccess(
      prisma,
      session.user.id
    );
    if (qualityAccessResponse) return qualityAccessResponse;

    const { cardId } = await params;

    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        archivedAt: null,
      },
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
    });

    if (!card) {
      return ApiErrors.notFound('Card');
    }

    const [dimensions, cycles] = await Promise.all([
      getApplicableReviewDimensionsForCard(prisma, card),
      prisma.reviewCycle.findMany({
        where: {
          cardId,
        },
        orderBy: {
          cycleNumber: 'asc',
        },
        select: {
          id: true,
          cycleNumber: true,
          openedAt: true,
          closedAt: true,
          isFinal: true,
          lockedAt: true,
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

    const reviewerIds = cycles.flatMap((cycle) =>
      cycle.evaluations.map((evaluation) => evaluation.reviewerId)
    );
    const reviewerRolesByUserId = await getReviewerRolesByUserIds(prisma, reviewerIds);

    const cycleSummaries = cycles.map((cycle) =>
      buildCycleAggregateSummary({
        cycle,
        dimensions,
        reviewerRolesByUserId,
      })
    );

    const latestCycleSummary = cycleSummaries.at(-1) ?? null;
    const finalCycleSummary =
      cycleSummaries.find((cycleSummary) => cycleSummary.isFinal) ?? null;

    return apiSuccess({
      card: {
        id: card.id,
        title: card.title,
        type: card.type,
        boardId: card.list.boardId,
        listId: card.list.id,
        listName: card.list.name,
        listPhase: card.list.phase,
      },
      dimensions: dimensions.map((dimension) => ({
        id: dimension.id,
        name: dimension.name,
        description: dimension.description,
        position: dimension.position,
      })),
      latestCycle: latestCycleSummary ? formatCycleSummary(latestCycleSummary) : null,
      finalCycle: finalCycleSummary ? formatCycleSummary(finalCycleSummary) : null,
      progression: cycleSummaries.map((cycleSummary) => ({
        cycleId: cycleSummary.cycleId,
        cycleNumber: cycleSummary.cycleNumber,
        openedAt: cycleSummary.openedAt,
        closedAt: cycleSummary.closedAt,
        isFinal: cycleSummary.isFinal,
        evaluationsCount: cycleSummary.evaluationsCount,
        overallAverage: toRoundedNumber(cycleSummary.overallAverage),
        qualityTier: cycleSummary.qualityTier,
      })),
      cycles: cycleSummaries.map(formatCycleSummary),
    });
  } catch (error) {
    console.error('Failed to fetch card quality summary:', error);
    return ApiErrors.internal('Failed to fetch card quality summary');
  }
}
