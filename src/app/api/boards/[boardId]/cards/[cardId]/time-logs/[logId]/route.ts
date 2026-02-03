import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/boards/[boardId]/cards/[cardId]/time-logs/[logId] - Update a time log (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string; logId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, cardId, logId } = await params;

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

    // Check if time log exists
    const existingLog = await prisma.timeLog.findFirst({
      where: {
        id: logId,
        cardId,
        card: {
          list: { boardId },
        },
      },
    });

    if (!existingLog) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Time log not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { startTime, endTime, durationMs, notes } = body;

    // Calculate duration if times are provided
    let calculatedDuration = durationMs;
    if (calculatedDuration === undefined && startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      calculatedDuration = end.getTime() - start.getTime();
    }

    const updateData: Record<string, unknown> = {};
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (calculatedDuration !== undefined) updateData.durationMs = calculatedDuration;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const timeLog = await prisma.timeLog.update({
      where: { id: logId },
      data: updateData,
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

    return NextResponse.json({ success: true, data: timeLog });
  } catch (error) {
    console.error('Failed to update time log:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update time log' } },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId]/time-logs/[logId] - Delete a time log (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string; logId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, cardId, logId } = await params;

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

    // Check if time log exists
    const existingLog = await prisma.timeLog.findFirst({
      where: {
        id: logId,
        cardId,
        card: {
          list: { boardId },
        },
      },
    });

    if (!existingLog) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Time log not found' } },
        { status: 404 }
      );
    }

    await prisma.timeLog.delete({
      where: { id: logId },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to delete time log:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete time log' } },
      { status: 500 }
    );
  }
}
