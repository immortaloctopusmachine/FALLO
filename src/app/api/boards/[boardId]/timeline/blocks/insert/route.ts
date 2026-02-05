import { prisma } from '@/lib/prisma';
import { getMonday, getFriday, moveBlockDates } from '@/lib/date-utils';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import { getPhaseFromBlockType } from '@/lib/constants';

// POST /api/boards/[boardId]/timeline/blocks/insert
// Inserts a new block at a position and shifts all blocks at or after that position to the right
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
    const { blockTypeId, startDate, endDate, insertBeforeBlockId, listId, createList, syncToList } = body;

    // Validate required fields
    if (!blockTypeId || !startDate || !endDate || !insertBeforeBlockId) {
      return ApiErrors.validation('blockTypeId, startDate, endDate, and insertBeforeBlockId are required');
    }

    // Validate block type exists
    const blockType = await prisma.blockType.findUnique({
      where: { id: blockTypeId },
    });

    if (!blockType) {
      return ApiErrors.notFound('Block type');
    }

    // Get the block we're inserting before
    const targetBlock = await prisma.timelineBlock.findFirst({
      where: {
        id: insertBeforeBlockId,
        boardId,
      },
    });

    if (!targetBlock) {
      return ApiErrors.notFound('Target block');
    }

    // Get all blocks at or after the target block's position (by start date)
    const blocksToShift = await prisma.timelineBlock.findMany({
      where: {
        boardId,
        startDate: {
          gte: targetBlock.startDate,
        },
      },
      include: {
        list: true,
      },
      orderBy: { startDate: 'asc' },
    });

    // Shift all these blocks to the right by one week, snapping to Mon-Fri
    const shiftUpdates = blocksToShift.map(async (block) => {
      const { newStartDate, newEndDate } = moveBlockDates(block.startDate, 1);

      // Update the block
      await prisma.timelineBlock.update({
        where: { id: block.id },
        data: {
          startDate: newStartDate,
          endDate: newEndDate,
        },
      });

      // If syncToList and block has a linked list, update the list dates too
      if (syncToList !== false && block.listId) {
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

    // Calculate position for the new block
    const existingBlocks = await prisma.timelineBlock.count({
      where: {
        boardId,
        blockTypeId,
      },
    });
    const blockPosition = existingBlocks + 1;

    // Snap incoming dates to Mon-Fri 5-day block
    const snappedMonday = getMonday(new Date(startDate));
    const snappedFriday = getFriday(snappedMonday);

    // If createList is true, create a corresponding Planning list
    let linkedListId = listId;
    if (createList && !listId) {
      // Get the board's planning lists to find the right position
      const planningLists = await prisma.list.findMany({
        where: {
          boardId,
          viewType: 'PLANNING',
        },
        orderBy: { position: 'desc' },
      });

      const nextPosition = planningLists.length > 0 ? planningLists[0].position + 1 : 0;

      // Map block type to list phase using centralized constants
      const listPhase = getPhaseFromBlockType(blockType.name);

      const newList = await prisma.list.create({
        data: {
          boardId,
          name: `${blockType.name} ${blockPosition}`,
          position: nextPosition,
          viewType: 'PLANNING',
          phase: listPhase as 'BACKLOG' | 'SPINE_PROTOTYPE' | 'CONCEPT' | 'PRODUCTION' | 'TWEAK' | 'DONE' | null,
          color: blockType.color,
          startDate: snappedMonday,
          endDate: snappedFriday,
        },
      });

      linkedListId = newList.id;
    }

    // Create the new block at the original target position
    const newBlock = await prisma.timelineBlock.create({
      data: {
        boardId,
        blockTypeId,
        startDate: snappedMonday,
        endDate: snappedFriday,
        position: blockPosition,
        listId: linkedListId || null,
      },
      include: {
        blockType: true,
        list: {
          select: {
            id: true,
            name: true,
            phase: true,
          },
        },
      },
    });

    return apiSuccess({
      block: {
        id: newBlock.id,
        startDate: newBlock.startDate.toISOString(),
        endDate: newBlock.endDate.toISOString(),
        position: newBlock.position,
        blockType: newBlock.blockType,
        list: newBlock.list,
      },
      shiftedCount: blocksToShift.length,
    }, 201);
  } catch (error) {
    console.error('Failed to insert block:', error);
    return ApiErrors.internal('Failed to insert block');
  }
}
