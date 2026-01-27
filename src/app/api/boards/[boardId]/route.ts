import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/boards/[boardId] - Get a single board with all details
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

    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
              },
            },
          },
        },
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              where: { archivedAt: null },
              orderBy: { position: 'asc' },
              include: {
                assignees: {
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
                _count: {
                  select: {
                    attachments: true,
                    comments: true,
                  },
                },
                checklists: {
                  include: {
                    items: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Board not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: board });
  } catch (error) {
    console.error('Failed to fetch board:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch board' } },
      { status: 500 }
    );
  }
}

// PATCH /api/boards/[boardId] - Update board
export async function PATCH(
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

    // Check if user is admin of this board
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to update this board' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, settings } = body;

    const board = await prisma.board.update({
      where: { id: boardId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(settings && { settings }),
      },
    });

    return NextResponse.json({ success: true, data: board });
  } catch (error) {
    console.error('Failed to update board:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update board' } },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[boardId] - Archive board
export async function DELETE(
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

    // Check if user is admin of this board
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to delete this board' } },
        { status: 403 }
      );
    }

    await prisma.board.update({
      where: { id: boardId },
      data: { archivedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to delete board:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete board' } },
      { status: 500 }
    );
  }
}
