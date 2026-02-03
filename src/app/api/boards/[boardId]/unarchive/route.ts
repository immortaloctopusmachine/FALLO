import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/boards/[boardId]/unarchive - Restore an archived board
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

    // Check if user is admin of this board
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
        permission: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to restore this board' } },
        { status: 403 }
      );
    }

    // Check if the board exists and is archived
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { archivedAt: true },
    });

    if (!board) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Board not found' } },
        { status: 404 }
      );
    }

    if (!board.archivedAt) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Board is not archived' } },
        { status: 400 }
      );
    }

    // Unarchive the board
    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: { archivedAt: null },
    });

    return NextResponse.json({ success: true, data: updatedBoard });
  } catch (error) {
    console.error('Failed to unarchive board:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to unarchive board' } },
      { status: 500 }
    );
  }
}
