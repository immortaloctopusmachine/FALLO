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

// GET /api/boards/[boardId]/timeline/blocks - Get all blocks for a board
export async function GET(
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

    // Check membership
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not a board member' } },
        { status: 403 }
      );
    }

    const blocks = await prisma.timelineBlock.findMany({
      where: { boardId },
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
      orderBy: [{ startDate: 'asc' }, { position: 'asc' }],
    });

    return NextResponse.json({ success: true, data: blocks });
  } catch (error) {
    console.error('Failed to fetch timeline blocks:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch timeline blocks' } },
      { status: 500 }
    );
  }
}

// POST /api/boards/[boardId]/timeline/blocks - Create a new timeline block
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
    const { blockTypeId, startDate, endDate, position, listId, createList } = body;

    // Validate required fields
    if (!blockTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'blockTypeId, startDate, and endDate are required' } },
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

    // Calculate position if not provided - count existing blocks of this type
    let blockPosition = position;
    if (blockPosition === undefined) {
      const existingBlocks = await prisma.timelineBlock.count({
        where: {
          boardId,
          blockTypeId,
        },
      });
      blockPosition = existingBlocks + 1;
    }

    // Snap dates to Mon-Fri 5-day block
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
        'QA': 'TWEAK',
        'MARKETING': 'TWEAK',
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

    const block = await prisma.timelineBlock.create({
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

    return NextResponse.json({ success: true, data: block }, { status: 201 });
  } catch (error) {
    console.error('Failed to create timeline block:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create timeline block' } },
      { status: 500 }
    );
  }
}
