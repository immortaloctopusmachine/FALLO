import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/settings/event-types/[eventTypeId] - Update an event type
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventTypeId: string }> }
) {
  try {
    const session = await auth();
    const { eventTypeId } = await params;

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
    const { name, description, color, icon, position } = body;

    // Check if event type exists
    const existingEventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
    });

    if (!existingEventType) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event type not found' } },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon || null;
    if (position !== undefined) updateData.position = position;

    const eventType = await prisma.eventType.update({
      where: { id: eventTypeId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: eventType });
  } catch (error) {
    console.error('Failed to update event type:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update event type' } },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/event-types/[eventTypeId] - Delete an event type
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventTypeId: string }> }
) {
  try {
    const session = await auth();
    const { eventTypeId } = await params;

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

    // Check if event type exists
    const existingEventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: {
        _count: { select: { events: true } },
      },
    });

    if (!existingEventType) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event type not found' } },
        { status: 404 }
      );
    }

    // Prevent deletion if event type is in use
    if (existingEventType._count.events > 0) {
      return NextResponse.json(
        { success: false, error: { code: 'IN_USE', message: 'Cannot delete event type that is in use' } },
        { status: 400 }
      );
    }

    // Prevent deletion of default event types
    if (existingEventType.isDefault) {
      return NextResponse.json(
        { success: false, error: { code: 'PROTECTED', message: 'Cannot delete default event types' } },
        { status: 400 }
      );
    }

    await prisma.eventType.delete({
      where: { id: eventTypeId },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to delete event type:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete event type' } },
      { status: 500 }
    );
  }
}
