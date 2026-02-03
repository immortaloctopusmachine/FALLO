import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/boards/[boardId]/cards/[cardId]/time-logs - Get time logs for a card
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, cardId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user has access to this board
    const membership = await prisma.boardMember.findUnique({
      where: {
        userId_boardId: { userId: session.user.id, boardId },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not a board member' } },
        { status: 403 }
      );
    }

    const timeLogs = await prisma.timeLog.findMany({
      where: { cardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        list: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    // Calculate total time
    const totalMs = timeLogs.reduce((sum, log) => sum + (log.durationMs || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        logs: timeLogs,
        totalMs,
        totalFormatted: formatDuration(totalMs),
      },
    });
  } catch (error) {
    console.error('Failed to fetch time logs:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch time logs' } },
      { status: 500 }
    );
  }
}

// POST /api/boards/[boardId]/cards/[cardId]/time-logs - Create a manual time log (admin only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, cardId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, listId, startTime, endTime, durationMs, notes } = body;

    // Validate required fields
    if (!userId || !listId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'userId and listId are required' } },
        { status: 400 }
      );
    }

    // Check if card exists on this board
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        list: { boardId },
      },
    });

    if (!card) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Card not found' } },
        { status: 404 }
      );
    }

    // Calculate duration if not provided
    let calculatedDuration = durationMs;
    if (!calculatedDuration && startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      calculatedDuration = end.getTime() - start.getTime();
    }

    const timeLog = await prisma.timeLog.create({
      data: {
        cardId,
        userId,
        listId,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : new Date(),
        durationMs: calculatedDuration || 0,
        isManual: true,
        notes: notes?.trim() || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        list: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: timeLog }, { status: 201 });
  } catch (error) {
    console.error('Failed to create time log:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create time log' } },
      { status: 500 }
    );
  }
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}
