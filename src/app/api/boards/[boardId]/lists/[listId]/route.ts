import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/boards/[boardId]/lists/[listId] - Update list
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; listId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, listId } = await params;

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
        { success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this board' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, position, color, phase, durationWeeks, durationDays, startDate, endDate } = body;

    // Validate phase if provided
    const validPhases = ['BACKLOG', 'SPINE_PROTOTYPE', 'CONCEPT', 'PRODUCTION', 'TWEAK', 'DONE'];
    const listPhase = phase !== undefined
      ? (phase && validPhases.includes(phase) ? phase : null)
      : undefined;

    const list = await prisma.list.update({
      where: { id: listId, boardId },
      data: {
        ...(name && { name: name.trim() }),
        ...(position !== undefined && { position }),
        ...(color !== undefined && { color: color || null }),
        ...(listPhase !== undefined && { phase: listPhase }),
        ...(durationWeeks !== undefined && { durationWeeks: durationWeeks || null }),
        ...(durationDays !== undefined && { durationDays: durationDays || null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error('Failed to update list:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update list' } },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[boardId]/lists/[listId] - Delete list
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; listId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, listId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to delete lists' } },
        { status: 403 }
      );
    }

    await prisma.list.delete({
      where: { id: listId, boardId },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to delete list:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete list' } },
      { status: 500 }
    );
  }
}
