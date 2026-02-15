import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { requireNonViewerQualityAccess } from '@/lib/quality-review-api';

// GET /api/cards/[cardId]/cycles
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
        list: {
          select: {
            id: true,
            name: true,
            boardId: true,
          },
        },
      },
    });

    if (!card) {
      return ApiErrors.notFound('Card');
    }

    const cycles = await prisma.reviewCycle.findMany({
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
        _count: {
          select: {
            evaluations: true,
          },
        },
        evaluations: {
          where: {
            reviewerId: session.user.id,
          },
          select: {
            id: true,
            updatedAt: true,
          },
        },
      },
    });

    return apiSuccess({
      card: {
        id: card.id,
        title: card.title,
        boardId: card.list.boardId,
        listId: card.list.id,
        listName: card.list.name,
      },
      cycles: cycles.map((cycle) => ({
        id: cycle.id,
        cycleNumber: cycle.cycleNumber,
        openedAt: cycle.openedAt,
        closedAt: cycle.closedAt,
        isFinal: cycle.isFinal,
        lockedAt: cycle.lockedAt,
        evaluationsCount: cycle._count.evaluations,
        hasCurrentUserEvaluation: cycle.evaluations.length > 0,
        currentUserEvaluationUpdatedAt: cycle.evaluations[0]?.updatedAt ?? null,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch review cycles for card:', error);
    return ApiErrors.internal('Failed to fetch review cycles');
  }
}
