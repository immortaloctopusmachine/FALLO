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

// Helper to shift a block by weeks, snapping to Mon-Fri 5-day blocks
function shiftBlockByWeeks(
  startDate: Date,
  weeks: number
): { newStartDate: Date; newEndDate: Date } {
  const currentMonday = getMonday(startDate);
  const newMonday = new Date(currentMonday);
  newMonday.setDate(newMonday.getDate() + weeks * 7);
  return { newStartDate: newMonday, newEndDate: getFriday(newMonday) };
}

// POST /api/boards/[boardId]/timeline/blocks/insert
// Inserts a new block at a position and shifts all blocks at or after that position to the right
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
    const { blockTypeId, startDate, endDate, insertBeforeBlockId, listId, createList, syncToList } = body;

    // Validate required fields
    if (!blockTypeId || !startDate || !endDate || !insertBeforeBlockId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'blockTypeId, startDate, endDate, and insertBeforeBlockId are required' } },
        { status: 400 }
      );
    }

    // Validate block type exists
    const blockType = await prisma.blockType.findUnique({
      where: { id: blockTypeId },
    });

    if (!blockType) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Block type not found' } },
        { status: 404 }
      );
    }

    // Get the block we're inserting before
    const targetBlock = await prisma.timelineBlock.findFirst({
      where: {
        id: insertBeforeBlockId,
        boardId,
      },
    });

    if (!targetBlock) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Target block not found' } },
        { status: 404 }
      );
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
      const { newStartDate, newEndDate } = shiftBlockByWeeks(block.startDate, 1);

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

      // Map block type to list phase - handle various name formats
      const phaseMapping: Record<string, string> = {
        'SPINE_PROTOTYPE': 'SPINE_PROTOTYPE',
        'SPINE PROTOTYPE': 'SPINE_PROTOTYPE',
        'CONCEPT': 'CONCEPT',
        'PRODUCTION': 'PRODUCTION',
        'TWEAK': 'TWEAK',
        'QA': 'TWEAK', // QA can map to TWEAK phase
        'MARKETING': 'TWEAK', // Marketing can map to TWEAK phase
      };

      const blockTypeName = blockType.name.toUpperCase().replace(/\s+/g, '_');
      const listPhase = phaseMapping[blockTypeName] || phaseMapping[blockType.name.toUpperCase()] || null;

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
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        block: newBlock,
        shiftedCount: blocksToShift.length,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to insert block:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to insert block' } },
      { status: 500 }
    );
  }
}
