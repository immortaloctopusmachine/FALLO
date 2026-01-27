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
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'List name is required' } },
        { status: 400 }
      );
    }

    // Get the highest position
    const lastList = await prisma.list.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
    });

    const list = await prisma.list.create({
      data: {
        name: name.trim(),
        position: (lastList?.position ?? -1) + 1,
        boardId,
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
