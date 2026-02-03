import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/boards/[boardId]/timeline - Get all timeline data for a board
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

    // Get board with team info
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        name: true,
        team: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // Get timeline blocks with assignments
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

    // Get timeline events
    const events = await prisma.timelineEvent.findMany({
      where: { boardId },
      include: {
        eventType: true,
      },
      orderBy: { startDate: 'asc' },
    });

    // Get available block types
    const blockTypes = await prisma.blockType.findMany({
      where: {
        OR: [
          { studioId: null }, // Global
          { studio: { teams: { some: { boards: { some: { id: boardId } } } } } }, // Studio-specific
        ],
      },
      orderBy: { position: 'asc' },
    });

    // Get available event types
    const eventTypes = await prisma.eventType.findMany({
      where: {
        OR: [
          { studioId: null }, // Global
          { studio: { teams: { some: { boards: { some: { id: boardId } } } } } }, // Studio-specific
        ],
      },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        board,
        blocks,
        events,
        blockTypes,
        eventTypes,
      },
    });
  } catch (error) {
    console.error('Failed to fetch timeline:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch timeline' } },
      { status: 500 }
    );
  }
}
