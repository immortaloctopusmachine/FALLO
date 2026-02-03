import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper to find the Monday of a given week (or previous Monday if not Monday)
function getMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  // If Sunday (0), go back 6 days; otherwise go back (day - 1) days
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

// Helper to get the Friday of a week given a Monday
function getFriday(monday: Date): Date {
  const result = new Date(monday);
  result.setDate(result.getDate() + 4); // Monday + 4 = Friday
  return result;
}

// Helper to move a block's dates by weeks, snapping to Mon-Fri 5-day blocks
function moveBlockDates(
  startDate: Date,
  _endDate: Date,
  weeksDelta: number
): { newStartDate: Date; newEndDate: Date } {
  // Get the Monday of the current week the block starts in
  const currentMonday = getMonday(startDate);

  // Move by the specified number of weeks (7 calendar days per week)
  const newMonday = new Date(currentMonday);
  newMonday.setDate(newMonday.getDate() + weeksDelta * 7);

  // End date is always Friday (5-day block: Mon-Fri)
  const newFriday = getFriday(newMonday);

  return { newStartDate: newMonday, newEndDate: newFriday };
}

// Helper to add business days to a date
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let remaining = Math.abs(days);
  const direction = days > 0 ? 1 : -1;

  while (remaining > 0) {
    result.setDate(result.getDate() + direction);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remaining--;
    }
  }
  return result;
}

// POST /api/boards/[boardId]/timeline/blocks/move-group
// Moves multiple blocks by a number of weeks
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth();
    const { boardId } = await params;

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

    const body = await request.json();
    const { blockIds, weeksDelta, blockMoves, eventIds, syncToList } = body;

    if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'blockIds array is required' } },
        { status: 400 }
      );
    }

    if (weeksDelta === undefined || weeksDelta === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'weeksDelta is required and must be non-zero' } },
        { status: 400 }
      );
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
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No blocks found' } },
        { status: 404 }
      );
    }

    // Update each block with its specific delta
    const updates = blocks.map(async (block) => {
      const delta = perBlockDelta.get(block.id) ?? weeksDelta;

      // Move dates by weeks, snapping start to Monday
      const { newStartDate, newEndDate } = moveBlockDates(
        block.startDate,
        block.endDate,
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

    return NextResponse.json({
      success: true,
      data: { movedBlocksCount: blocks.length, movedEventsCount },
    });
  } catch (error) {
    console.error('Failed to move blocks:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to move blocks' } },
      { status: 500 }
    );
  }
}
