import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/boards/[boardId]/timeline/events - Get all events for a board
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

    const events = await prisma.timelineEvent.findMany({
      where: { boardId },
      include: {
        eventType: true,
      },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('Failed to fetch timeline events:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch timeline events' } },
      { status: 500 }
    );
  }
}

// POST /api/boards/[boardId]/timeline/events - Create a new timeline event
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
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, eventTypeId, startDate, endDate } = body;

    // Validate required fields
    if (!title || !eventTypeId || !startDate) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'title, eventTypeId, and startDate are required' } },
        { status: 400 }
      );
    }

    // Validate event type exists
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
    });

    if (!eventType) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event type not found' } },
        { status: 404 }
      );
    }

    // For single-day events, endDate equals startDate
    const eventEndDate = endDate ? new Date(endDate) : new Date(startDate);

    const event = await prisma.timelineEvent.create({
      data: {
        boardId,
        title: title.trim(),
        description: description?.trim() || null,
        eventTypeId,
        startDate: new Date(startDate),
        endDate: eventEndDate,
      },
      include: {
        eventType: true,
      },
    });

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    console.error('Failed to create timeline event:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create timeline event' } },
      { status: 500 }
    );
  }
}
