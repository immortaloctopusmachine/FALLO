import { prisma } from '@/lib/prisma';
import { moveBlockDates } from '@/lib/date-utils';
import { renumberTimelineBlockPositions } from '@/lib/timeline-block-position';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// DELETE /api/boards/[boardId]/timeline/blocks/[blockId]/delete-and-shift
// Deletes a block and shifts all blocks to the right of it left by one week
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; blockId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, blockId } = await params;

    // Check if user is admin
    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    // Get the block to delete
    const blockToDelete = await prisma.timelineBlock.findFirst({
      where: {
        id: blockId,
        boardId,
      },
    });

    if (!blockToDelete) {
      return ApiErrors.notFound('Block');
    }

    // Parse body for options
    let syncToList = true;
    let deleteLinkedList = true;
    let destinationListId: string | null = null;
    let deleteCards = false;
    try {
      const body = await request.json();
      syncToList = body.syncToList !== false;
      deleteLinkedList = body.deleteLinkedList !== false;
      destinationListId = typeof body.destinationListId === 'string' ? body.destinationListId : null;
      deleteCards = body.deleteCards === true;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Get all blocks to the right of the deleted block (by start date)
    const blocksToShift = await prisma.timelineBlock.findMany({
      where: {
        boardId,
        startDate: {
          gt: blockToDelete.startDate,
        },
      },
      include: {
        list: true,
      },
      orderBy: { startDate: 'asc' },
    });

    // Store the linked list ID before deleting the block
    const linkedListId = blockToDelete.listId;

    // Delete the block
    await prisma.timelineBlock.delete({
      where: { id: blockId },
    });

    // Delete the linked Planning list if requested
    if (deleteLinkedList && linkedListId) {
      const cardCount = await prisma.card.count({
        where: {
          listId: linkedListId,
          archivedAt: null,
        },
      });

      if (cardCount > 0) {
        if (destinationListId) {
          const destination = await prisma.list.findFirst({
            where: {
              id: destinationListId,
              boardId,
              viewType: 'PLANNING',
            },
          });

          if (!destination || destination.id === linkedListId) {
            return ApiErrors.validation('destinationListId must be a different planning list in this project');
          }

          await prisma.card.updateMany({
            where: { listId: linkedListId, archivedAt: null },
            data: { listId: destination.id },
          });
        } else if (deleteCards) {
          await prisma.card.deleteMany({
            where: { listId: linkedListId, archivedAt: null },
          });
        } else {
          return ApiErrors.validation('Cards exist in this list. Choose a destination list or delete cards before deleting the block.');
        }
      }

      // Now delete the linked list
      await prisma.list.delete({
        where: { id: linkedListId },
      });
    }

    // Shift all blocks to the left by one week, snapping to Mon-Fri
    if (blocksToShift.length > 0) {
      const shiftUpdates = blocksToShift.map(async (block) => {
        const { newStartDate, newEndDate } = moveBlockDates(block.startDate, -1);

        // Update the block
        await prisma.timelineBlock.update({
          where: { id: block.id },
          data: {
            startDate: newStartDate,
            endDate: newEndDate,
          },
        });

        // If syncToList and block has a linked list, update the list dates too
        if (syncToList && block.listId) {
          await prisma.list.update({
            where: { id: block.listId },
            data: {
              startDate: newStartDate,
              endDate: newEndDate,
            },
          });
        }
      });

      await Promise.all(shiftUpdates);
    }

    await renumberTimelineBlockPositions(boardId);

    return apiSuccess({
      deletedBlockId: blockId,
      deletedListId: deleteLinkedList ? linkedListId : null,
      shiftedCount: blocksToShift.length,
    });
  } catch (error) {
    console.error('Failed to delete and shift blocks:', error);
    return ApiErrors.internal('Failed to delete and shift blocks');
  }
}
