import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/boards/[boardId]/timeline/events/[eventId] - Get a single event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; eventId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, eventId } = await params;

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

    const event = await prisma.timelineEvent.findFirst({
      where: {
        id: eventId,
        boardId,
      },
      include: {
        eventType: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error('Failed to fetch timeline event:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch timeline event' } },
      { status: 500 }
    );
  }
}

// PATCH /api/boards/[boardId]/timeline/events/[eventId] - Update an event
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; eventId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, eventId } = await params;

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

    // Check if event exists
    const existingEvent = await prisma.timelineEvent.findFirst({
      where: {
        id: eventId,
        boardId,
      },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, description, eventTypeId, startDate, endDate } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (eventTypeId !== undefined) updateData.eventTypeId = eventTypeId;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);

    const event = await prisma.timelineEvent.update({
      where: { id: eventId },
      data: updateData,
      include: {
        eventType: true,
      },
    });

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error('Failed to update timeline event:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update timeline event' } },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[boardId]/timeline/events/[eventId] - Delete an event
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; eventId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, eventId } = await params;

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

    // Check if event exists
    const existingEvent = await prisma.timelineEvent.findFirst({
      where: {
        id: eventId,
        boardId,
      },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        { status: 404 }
      );
    }

    await prisma.timelineEvent.delete({
      where: { id: eventId },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to delete timeline event:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete timeline event' } },
      { status: 500 }
    );
  }
}
