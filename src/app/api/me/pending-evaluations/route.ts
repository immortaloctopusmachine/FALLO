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

    const [allActiveDimensions, allPendingCycles] = await Promise.all([
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
                      settings: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    // Filter to only cycles where user is assigned as lead/PO on the specific board
    const pendingCycles = allPendingCycles.filter((cycle) => {
      const settings = cycle.card.list.board.settings;
      if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
        return false;
      }

      const projectRoleAssignments = (settings as Record<string, unknown>).projectRoleAssignments;
      if (!Array.isArray(projectRoleAssignments)) {
        return false;
      }

      // Check if user is assigned as lead or PO on this board
      return projectRoleAssignments.some((assignment: unknown) => {
        if (!assignment || typeof assignment !== 'object') return false;
        const assignmentUserId = (assignment as Record<string, unknown>).userId;
        const assignmentRoleName = (assignment as Record<string, unknown>).roleName;

        if (assignmentUserId !== session.user.id || typeof assignmentRoleName !== 'string') {
          return false;
        }

        const normalizedRole = assignmentRoleName.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
        // Match same patterns as resolveApprovers in role-utils.ts
        const isPO = normalizedRole === 'po' || normalizedRole.includes('po') || normalizedRole.includes('product owner');
        const isLead = normalizedRole === 'lead' || normalizedRole.endsWith(' lead') || normalizedRole.startsWith('lead ');
        return isPO || isLead;
      });
    });

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
