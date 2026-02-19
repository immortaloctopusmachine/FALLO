import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import { handleCardListTransition } from '@/lib/quality-review';
import { createNotificationWithSlackDM } from '@/lib/notifications';
import { resolveApprovers } from '@/lib/role-utils';
import type { BoardSettings } from '@/types';

// Helper to check if a list is an "in progress" list (for time tracking)
function isInProgressList(listName: string): boolean {
  const lowerName = listName.toLowerCase();
  return (
    lowerName.includes('in progress') ||
    lowerName.includes('in-progress') ||
    lowerName.includes('doing') ||
    lowerName.includes('working') ||
    lowerName === 'wip'
  );
}

// POST /api/boards/[boardId]/cards/reorder - Reorder cards (for drag-drop)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const body = await request.json();
    const { cardId, sourceListId, destinationListId, newPosition } = body;

    if (!cardId || !sourceListId || !destinationListId || newPosition === undefined) {
      return ApiErrors.validation('Missing required fields');
    }

    // Verify lists belong to board
    const lists = await prisma.list.findMany({
      where: {
        id: { in: [sourceListId, destinationListId] },
        boardId,
      },
      select: {
        id: true,
        name: true,
        phase: true,
        viewType: true,
      },
    });

    if (lists.length !== (sourceListId === destinationListId ? 1 : 2)) {
      return ApiErrors.notFound('Lists');
    }

    // Check if we need to track time (only when moving between different lists)
    const sourceList = lists.find((l) => l.id === sourceListId);
    const destList = lists.find((l) => l.id === destinationListId) || sourceList;

    const wasInProgress = sourceList && isInProgressList(sourceList.name);
    const isNowInProgress = destList && isInProgressList(destList.name);

    // Use a transaction to update positions (timeout increased: card moves + position cleanup + review cycle transitions)
    await prisma.$transaction(async (tx) => {
      // If moving to a different list
      if (sourceListId !== destinationListId) {
        // Shift cards down in destination list
        await tx.card.updateMany({
          where: {
            listId: destinationListId,
            position: { gte: newPosition },
          },
          data: {
            position: { increment: 1 },
          },
        });

        // Move the card
        await tx.card.update({
          where: { id: cardId },
          data: {
            listId: destinationListId,
            position: newPosition,
          },
        });

        // Clean up positions in source list
        const sourceCards = await tx.card.findMany({
          where: { listId: sourceListId },
          orderBy: { position: 'asc' },
        });

        for (let i = 0; i < sourceCards.length; i++) {
          if (sourceCards[i].position !== i) {
            await tx.card.update({
              where: { id: sourceCards[i].id },
              data: { position: i },
            });
          }
        }

        if (sourceList && destList) {
          await handleCardListTransition(tx, {
            cardId,
            fromList: sourceList,
            toList: destList,
          });
        }
      } else {
        // Moving within the same list
        const card = await tx.card.findUnique({ where: { id: cardId } });
        if (!card) throw new Error('Card not found');

        const oldPosition = card.position;

        if (oldPosition < newPosition) {
          // Moving down: shift cards up
          await tx.card.updateMany({
            where: {
              listId: sourceListId,
              position: { gt: oldPosition, lte: newPosition },
            },
            data: {
              position: { decrement: 1 },
            },
          });
        } else if (oldPosition > newPosition) {
          // Moving up: shift cards down
          await tx.card.updateMany({
            where: {
              listId: sourceListId,
              position: { gte: newPosition, lt: oldPosition },
            },
            data: {
              position: { increment: 1 },
            },
          });
        }

        await tx.card.update({
          where: { id: cardId },
          data: { position: newPosition },
        });
      }
    }, { timeout: 15000 });

    // Handle time tracking when moving between lists
    if (sourceListId !== destinationListId) {
      // Card moved to a new list - check time tracking
      if (wasInProgress && !isNowInProgress) {
        // Card LEFT "In Progress" - stop any active time log
        const activeLog = await prisma.timeLog.findFirst({
          where: {
            cardId,
            userId: session.user.id,
            endTime: null,
          },
        });

        if (activeLog) {
          const endTime = new Date();
          const durationMs = endTime.getTime() - new Date(activeLog.startTime).getTime();

          await prisma.timeLog.update({
            where: { id: activeLog.id },
            data: {
              endTime,
              durationMs,
            },
          });
        }
      } else if (!wasInProgress && isNowInProgress && destList) {
        // Card ENTERED "In Progress" - start a new time log
        // Only start if user is assigned to the card or is the one moving it
        const card = await prisma.card.findUnique({
          where: { id: cardId },
          include: {
            assignees: {
              select: { userId: true },
            },
          },
        });

        const isAssigned = card?.assignees.some((a) => a.userId === session.user.id);

        // Start tracking if user is assigned or if no one is assigned
        if (isAssigned || !card?.assignees.length) {
          // Close any existing open logs first
          await prisma.timeLog.updateMany({
            where: {
              cardId,
              userId: session.user.id,
              endTime: null,
            },
            data: {
              endTime: new Date(),
            },
          });

          // Create new time log
          await prisma.timeLog.create({
            data: {
              cardId,
              userId: session.user.id,
              listId: destList.id,
              startTime: new Date(),
            },
          });
        }
      }
    }

    // Notify PO/Lead when a task enters a review list
    if (sourceListId !== destinationListId && destList) {
      const isReviewDest = destList.name.toLowerCase().includes('review');
      const isReviewSrc = sourceList?.name.toLowerCase().includes('review');

      if (isReviewDest && !isReviewSrc) {
        // Fire-and-forget: don't block the response
        (async () => {
          try {
            const [boardData, cardData] = await Promise.all([
              prisma.board.findUnique({ where: { id: boardId }, select: { name: true, settings: true } }),
              prisma.card.findUnique({ where: { id: cardId }, select: { title: true } }),
            ]);
            const settings = (boardData?.settings || {}) as BoardSettings;
            const roleAssignments = settings.projectRoleAssignments || [];
            const approvers = resolveApprovers(roleAssignments);

            if (approvers.length === 0) return;

            // Fetch Slack user IDs for the approvers
            const approverUserIds = [...new Set(approvers.map((a) => a.userId))];
            const users = await prisma.user.findMany({
              where: { id: { in: approverUserIds } },
              select: { id: true, slackUserId: true, name: true },
            });
            const userMap = new Map(users.map((u) => [u.id, u]));

            for (const approver of approvers) {
              const user = userMap.get(approver.userId);
              if (!user) continue;

              await createNotificationWithSlackDM({
                userId: approver.userId,
                type: 'review_requested',
                title: `Review requested (${approver.roleName})`,
                message: `Task "${cardData?.title || 'Untitled'}" is ready for your review on ${boardData?.name || 'a board'}`,
                data: { boardId, cardId, cardTitle: cardData?.title },
                slackUserId: user.slackUserId,
              });
            }
          } catch (err) {
            console.error('Failed to send review notifications:', err);
          }
        })();
      }
    }

    return apiSuccess(null);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('Failed to reorder cards:', detail, error);
    return ApiErrors.internal(`Failed to reorder cards: ${detail}`);
  }
}
