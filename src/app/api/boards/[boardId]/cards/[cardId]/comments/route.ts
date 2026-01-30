import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ boardId: string; cardId: string }>;
}

// GET /api/boards/[boardId]/cards/[cardId]/comments
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { boardId, cardId } = await context.params;

    // Verify membership
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

    // Verify card exists and belongs to this board
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        list: { boardId },
      },
    });

    if (!card) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Card not found' } },
        { status: 404 }
      );
    }

    const comments = await prisma.comment.findMany({
      where: { cardId, attachmentId: null },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: comments });
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch comments' } },
      { status: 500 }
    );
  }
}

// POST /api/boards/[boardId]/cards/[cardId]/comments
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { cardId } = await context.params;
    const body = await request.json();
    const { content, attachmentId } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CONTENT', message: 'Comment content is required' } },
        { status: 400 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        authorId: session.user.id,
        cardId,
        ...(attachmentId && { attachmentId }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return NextResponse.json(
      { success: false, error: { code: 'CREATE_FAILED', message: 'Failed to create comment' } },
      { status: 500 }
    );
  }
}
