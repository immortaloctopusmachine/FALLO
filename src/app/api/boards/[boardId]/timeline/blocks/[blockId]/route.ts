import { prisma } from '@/lib/prisma';
import { getMonday, getFriday } from '@/lib/date-utils';
import { renumberTimelineBlockPositions } from '@/lib/timeline-block-position';
import {
  requireAuth,
  requireAdmin,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/timeline/blocks/[blockId] - Get a single block
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; blockId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, blockId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const block = await prisma.timelineBlock.findFirst({
      where: {
        id: blockId,
        boardId,
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

    if (!block) {
      return ApiErrors.notFound('Block');
    }

    return apiSuccess({
      id: block.id,
      startDate: block.startDate.toISOString(),
      endDate: block.endDate.toISOString(),
      position: block.position,
      blockType: block.blockType,
      list: block.list,
    });
  } catch (error) {
    console.error('Failed to fetch timeline block:', error);
    return ApiErrors.internal('Failed to fetch timeline block');
  }
}

// PATCH /api/boards/[boardId]/timeline/blocks/[blockId] - Update a block
export async function PATCH(
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

    // Check if block exists
    const existingBlock = await prisma.timelineBlock.findFirst({
      where: {
        id: blockId,
        boardId,
      },
      include: {
        list: true,
      },
    });

    if (!existingBlock) {
      return ApiErrors.notFound('Block');
    }

    const body = await request.json();
    const { startDate, endDate, position, blockTypeId, listId, syncToList } = body;

    const updateData: Record<string, unknown> = {};

    // If startDate is provided, snap to Monday and auto-set Friday end
    if (startDate !== undefined) {
      const snappedMonday = getMonday(new Date(startDate));
      const snappedFriday = getFriday(snappedMonday);
      updateData.startDate = snappedMonday;
      updateData.endDate = snappedFriday;
    } else if (endDate !== undefined) {
      // If only endDate provided (rare), still snap based on it
      const snappedMonday = getMonday(new Date(endDate));
      const snappedFriday = getFriday(snappedMonday);
      updateData.startDate = snappedMonday;
      updateData.endDate = snappedFriday;
    }

    if (position !== undefined) updateData.position = position;
    if (blockTypeId !== undefined) updateData.blockTypeId = blockTypeId;
    if (listId !== undefined) updateData.listId = listId || null;

    // If changing block type, fetch the new block type for syncing
    let newBlockType = null;
    if (blockTypeId && blockTypeId !== existingBlock.blockTypeId) {
      newBlockType = await prisma.blockType.findUnique({
        where: { id: blockTypeId },
      });
    }

    const block = await prisma.timelineBlock.update({
      where: { id: blockId },
      data: updateData,
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

    // If syncToList is true and block has a linked list, update the list
    if (syncToList && block.listId) {
      // Map block type to list phase
      const phaseMapping: Record<string, 'BACKLOG' | 'SPINE_PROTOTYPE' | 'CONCEPT' | 'PRODUCTION' | 'TWEAK' | 'DONE'> = {
        'SPINE_PROTOTYPE': 'SPINE_PROTOTYPE',
        'SPINE PROTOTYPE': 'SPINE_PROTOTYPE',
        'CONCEPT': 'CONCEPT',
        'PRODUCTION': 'PRODUCTION',
        'TWEAK': 'TWEAK',
      };

      const listUpdateData: Record<string, unknown> = {
        startDate: block.startDate,
        endDate: block.endDate,
      };

      // If block type changed, also update the list's phase and name
      if (newBlockType) {
        const blockTypeName = newBlockType.name.toUpperCase().replace(/\s+/g, '_');
        const newPhase = phaseMapping[blockTypeName] || phaseMapping[newBlockType.name.toUpperCase()];
        if (newPhase) {
          listUpdateData.phase = newPhase;
        }
        // Update list name to match new block type
        listUpdateData.name = `${newBlockType.name} ${block.position}`;
        listUpdateData.color = newBlockType.color;
      }

      await prisma.list.update({
        where: { id: block.listId },
        data: listUpdateData,
      });
    }

    await renumberTimelineBlockPositions(boardId);

    const renumberedBlock = await prisma.timelineBlock.findUnique({
      where: { id: block.id },
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

    if (!renumberedBlock) {
      return ApiErrors.notFound('Block');
    }

    return apiSuccess(renumberedBlock);
  } catch (error) {
    console.error('Failed to update timeline block:', error);
    return ApiErrors.internal('Failed to update timeline block');
  }
}

// DELETE /api/boards/[boardId]/timeline/blocks/[blockId] - Delete a block
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

    // Check if block exists
    const existingBlock = await prisma.timelineBlock.findFirst({
      where: {
        id: blockId,
        boardId,
      },
    });

    if (!existingBlock) {
      return ApiErrors.notFound('Block');
    }

    // Parse body for options
    let deleteLinkedList = true;
    let destinationListId: string | null = null;
    let deleteCards = false;
    try {
      const body = await request.json();
      deleteLinkedList = body.deleteLinkedList !== false;
      destinationListId = typeof body.destinationListId === 'string' ? body.destinationListId : null;
      deleteCards = body.deleteCards === true;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Store the linked list ID before deleting the block
    const linkedListId = existingBlock.listId;

    // Delete the block (assignments will cascade delete)
    await prisma.timelineBlock.delete({
      where: { id: blockId },
    });

    await renumberTimelineBlockPositions(boardId);

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

    return apiSuccess({
      deletedBlockId: blockId,
      deletedListId: deleteLinkedList ? linkedListId : null,
    });
  } catch (error) {
    console.error('Failed to delete timeline block:', error);
    return ApiErrors.internal('Failed to delete timeline block');
  }
}
