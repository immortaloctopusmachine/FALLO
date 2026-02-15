import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import {
  getApplicableReviewDimensionsForCard,
  requireEvaluatorAccess,
  REVIEW_DIMENSION_INCLUDE,
} from '@/lib/quality-review-api';

// GET /api/me/pending-evaluations
export async function GET() {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { access, response: evaluatorResponse } = await requireEvaluatorAccess(
      prisma,
      session.user.id
    );
    if (evaluatorResponse) return evaluatorResponse;

    const [allActiveDimensions, pendingCycles] = await Promise.all([
      prisma.reviewDimension.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          position: 'asc',
        },
        include: REVIEW_DIMENSION_INCLUDE,
      }),
      prisma.reviewCycle.findMany({
        where: {
          lockedAt: null,
          card: {
            archivedAt: null,
          },
          evaluations: {
            none: {
              reviewerId: session.user.id,
            },
          },
        },
        orderBy: {
          openedAt: 'desc',
        },
        select: {
          id: true,
          cycleNumber: true,
          openedAt: true,
          closedAt: true,
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
        },
      }),
    ]);

    const pending = [] as Array<{
      cycleId: string;
      cycleNumber: number;
      openedAt: Date;
      closedAt: Date | null;
      isInReview: boolean;
      eligibleDimensionCount: number;
      eligibleDimensionIds: string[];
      card: {
        id: string;
        title: string;
        type: string;
        boardId: string;
        boardName: string;
        listId: string;
        listName: string;
      };
    }>;

    for (const cycle of pendingCycles) {
      const eligibleDimensions = await getApplicableReviewDimensionsForCard(
        prisma,
        cycle.card,
        access.evaluatorRoles,
        allActiveDimensions
      );

      if (eligibleDimensions.length === 0) {
        continue;
      }

      pending.push({
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        openedAt: cycle.openedAt,
        closedAt: cycle.closedAt,
        isInReview: cycle.closedAt === null,
        eligibleDimensionCount: eligibleDimensions.length,
        eligibleDimensionIds: eligibleDimensions.map((dimension) => dimension.id),
        card: {
          id: cycle.card.id,
          title: cycle.card.title,
          type: cycle.card.type,
          boardId: cycle.card.list.boardId,
          boardName: cycle.card.list.board.name,
          listId: cycle.card.list.id,
          listName: cycle.card.list.name,
        },
      });
    }

    return apiSuccess({
      evaluatorRoles: access.evaluatorRoles,
      pendingCount: pending.length,
      pending,
    });
  } catch (error) {
    console.error('Failed to fetch pending evaluations:', error);
    return ApiErrors.internal('Failed to fetch pending evaluations');
  }
}
