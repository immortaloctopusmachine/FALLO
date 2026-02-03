import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper to find the Monday of a given week
function getMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

// Helper to get the Friday of a week given a Monday
function getFriday(monday: Date): Date {
  const result = new Date(monday);
  result.setDate(result.getDate() + 4);
  return result;
}

// Helper to shift a block by weeks (negative for left), snapping to Mon-Fri
function shiftBlockByWeeks(
  startDate: Date,
  weeks: number
): { newStartDate: Date; newEndDate: Date } {
  const currentMonday = getMonday(startDate);
  const newMonday = new Date(currentMonday);
  newMonday.setDate(newMonday.getDate() + weeks * 7);
  return { newStartDate: newMonday, newEndDate: getFriday(newMonday) };
}

// DELETE /api/boards/[boardId]/timeline/blocks/[blockId]/delete-and-shift
// Deletes a block and shifts all blocks to the right of it left by one week
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; blockId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, blockId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });

    if (user?.permission !== 'ADMIN' && user?.permission !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Get the block to delete
    const blockToDelete = await prisma.timelineBlock.findFirst({
      where: {
        id: blockId,
        boardId,
      },
    });

    if (!blockToDelete) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Block not found' } },
        { status: 404 }
      );
    }

    // Parse body for options
    let syncToList = true;
    let deleteLinkedList = true;
    try {
      const body = await request.json();
      syncToList = body.syncToList !== false;
      deleteLinkedList = body.deleteLinkedList !== false;
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
      // First, move any cards from this list to the board's first task list (or delete if no suitable list)
      const taskList = await prisma.list.findFirst({
        where: {
          boardId,
          viewType: 'TASKS',
        },
        orderBy: { position: 'asc' },
      });

      if (taskList) {
        // Move cards to the first task list
        await prisma.card.updateMany({
          where: { listId: linkedListId },
          data: { listId: taskList.id },
        });
      } else {
        // Delete cards if no task list exists (shouldn't happen normally)
        await prisma.card.deleteMany({
          where: { listId: linkedListId },
        });
      }

      // Now delete the linked list
      await prisma.list.delete({
        where: { id: linkedListId },
      });
    }

    // Shift all blocks to the left by one week, snapping to Mon-Fri
    if (blocksToShift.length > 0) {
      const shiftUpdates = blocksToShift.map(async (block) => {
        const { newStartDate, newEndDate } = shiftBlockByWeeks(block.startDate, -1);

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

    return NextResponse.json({
      success: true,
      data: {
        deletedBlockId: blockId,
        deletedListId: deleteLinkedList ? linkedListId : null,
        shiftedCount: blocksToShift.length,
      },
    });
  } catch (error) {
    console.error('Failed to delete and shift blocks:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete and shift blocks' } },
      { status: 500 }
    );
  }
}
