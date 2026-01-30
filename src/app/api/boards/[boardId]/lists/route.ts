import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/boards/[boardId]/lists - Create a new list
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
    const { name, viewType, phase, color, durationWeeks, startDate, endDate } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'List name is required' } },
        { status: 400 }
      );
    }

    // Validate viewType if provided
    const validViewTypes = ['TASKS', 'PLANNING'];
    const listViewType = viewType && validViewTypes.includes(viewType) ? viewType : 'TASKS';

    // Validate phase if provided
    const validPhases = ['BACKLOG', 'SPINE_PROTOTYPE', 'CONCEPT', 'PRODUCTION', 'TWEAK', 'DONE'];
    const listPhase = phase && validPhases.includes(phase) ? phase : null;

    // Get the highest position for this view type
    const lastList = await prisma.list.findFirst({
      where: {
        boardId,
        viewType: listViewType,
      },
      orderBy: { position: 'desc' },
    });

    const list = await prisma.list.create({
      data: {
        name: name.trim(),
        position: (lastList?.position ?? -1) + 1,
        boardId,
        viewType: listViewType,
        phase: listPhase,
        color: color || null,
        durationWeeks: durationWeeks || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json({ success: true, data: list }, { status: 201 });
  } catch (error) {
    console.error('Failed to create list:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create list' } },
      { status: 500 }
    );
  }
}
