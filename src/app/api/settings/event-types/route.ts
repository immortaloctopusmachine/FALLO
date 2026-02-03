import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/settings/event-types - Get all event types
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const eventTypes = await prisma.eventType.findMany({
      where: {
        studioId: null, // Global event types only for now
      },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { events: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: eventTypes });
  } catch (error) {
    console.error('Failed to fetch event types:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch event types' } },
      { status: 500 }
    );
  }
}

// POST /api/settings/event-types - Create a new event type
export async function POST(request: Request) {
  try {
    const session = await auth();

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
    const { name, description, color, icon } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Event type name is required' } },
        { status: 400 }
      );
    }

    if (!color || typeof color !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Event type color is required' } },
        { status: 400 }
      );
    }

    // Get the highest position
    const maxPosition = await prisma.eventType.aggregate({
      where: { studioId: null },
      _max: { position: true },
    });

    const eventType = await prisma.eventType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color,
        icon: icon || null,
        position: (maxPosition._max.position ?? -1) + 1,
        isDefault: false,
        studioId: null,
      },
    });

    return NextResponse.json({ success: true, data: eventType }, { status: 201 });
  } catch (error) {
    console.error('Failed to create event type:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create event type' } },
      { status: 500 }
    );
  }
}
