import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/boards/[boardId]/cards/[cardId] - Get card details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, cardId } = await params;

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

    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        list: { boardId },
      },
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
        attachments: true,
        comments: {
          orderBy: { createdAt: 'desc' },
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
        },
        checklists: {
          orderBy: { position: 'asc' },
          include: {
            items: {
              orderBy: { position: 'asc' },
            },
          },
        },
        children: {
          where: { archivedAt: null },
          include: {
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
        parent: true,
      },
    });

    if (!card) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Card not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: card });
  } catch (error) {
    console.error('Failed to fetch card:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch card' } },
      { status: 500 }
    );
  }
}

// PATCH /api/boards/[boardId]/cards/[cardId] - Update card
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, cardId } = await params;

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
    const { title, description, position, listId, color, taskData, userStoryData, epicData, utilityData } = body;

    const card = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(position !== undefined && { position }),
        ...(listId && { listId }),
        ...(color !== undefined && { color }),
        ...(taskData && { taskData }),
        ...(userStoryData && { userStoryData }),
        ...(epicData && { epicData }),
        ...(utilityData && { utilityData }),
      },
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
    });

    return NextResponse.json({ success: true, data: card });
  } catch (error) {
    console.error('Failed to update card:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update card' } },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId] - Archive card
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, cardId } = await params;

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

    await prisma.card.update({
      where: { id: cardId },
      data: { archivedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to delete card:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete card' } },
      { status: 500 }
    );
  }
}
