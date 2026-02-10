import { prisma } from '@/lib/prisma';
import { moveBlockDates, addBusinessDays } from '@/lib/date-utils';
import { renumberTimelineBlockPositions } from '@/lib/timeline-block-position';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// POST /api/boards/[boardId]/timeline/blocks/move-group
// Moves multiple blocks by a number of weeks
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    // Check if user is admin
    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { blockIds, weeksDelta, blockMoves, eventIds, syncToList } = body;

    if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0) {
      return ApiErrors.validation('blockIds array is required');
    }

    if (weeksDelta === undefined || weeksDelta === 0) {
      return ApiErrors.validation('weeksDelta is required and must be non-zero');
    }

    // Build per-block delta map (if blockMoves provided, use per-block deltas)
    const perBlockDelta = new Map<string, number>();
    if (blockMoves && Array.isArray(blockMoves)) {
      for (const move of blockMoves) {
        perBlockDelta.set(move.id, move.weeksDelta);
      }
    }

    // Fetch all blocks to update
    const blocks = await prisma.timelineBlock.findMany({
      where: {
        id: { in: blockIds },
        boardId,
      },
      include: {
        list: true,
      },
    });

    if (blocks.length === 0) {
      return ApiErrors.notFound('No blocks found');
    }

    // Update each block with its specific delta
    const updates = blocks.map(async (block) => {
      const delta = perBlockDelta.get(block.id) ?? weeksDelta;

      // Move dates by weeks, snapping start to Monday
      const { newStartDate, newEndDate } = moveBlockDates(
        block.startDate,
        delta
      );

      // Update the block
      const updatedBlock = await prisma.timelineBlock.update({
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

      return updatedBlock;
    });

    await Promise.all(updates);
    await renumberTimelineBlockPositions(boardId);

    // Also move events if eventIds are provided
    let movedEventsCount = 0;
    if (eventIds && Array.isArray(eventIds) && eventIds.length > 0) {
      const businessDaysDelta = weeksDelta * 5; // 5 business days per week

      const events = await prisma.timelineEvent.findMany({
        where: {
          id: { in: eventIds },
          boardId,
        },
      });

      const eventUpdates = events.map(async (event) => {
        const newStartDate = addBusinessDays(event.startDate, businessDaysDelta);
        const newEndDate = addBusinessDays(event.endDate, businessDaysDelta);

        return prisma.timelineEvent.update({
          where: { id: event.id },
          data: {
            startDate: newStartDate,
            endDate: newEndDate,
          },
        });
      });

      await Promise.all(eventUpdates);
      movedEventsCount = events.length;
    }

    return apiSuccess({ movedBlocksCount: blocks.length, movedEventsCount });
  } catch (error) {
    console.error('Failed to move blocks:', error);
    return ApiErrors.internal('Failed to move blocks');
  }
}
