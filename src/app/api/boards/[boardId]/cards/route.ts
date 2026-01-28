import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { CardType } from '@/types';

// POST /api/boards/[boardId]/cards - Create a new card
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
    const { title, type, listId, description, taskData, userStoryData, epicData, utilityData } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Card title is required' } },
        { status: 400 }
      );
    }

    if (!listId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'List ID is required' } },
        { status: 400 }
      );
    }

    // Verify list belongs to board
    const list = await prisma.list.findFirst({
      where: { id: listId, boardId },
    });

    if (!list) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'List not found' } },
        { status: 404 }
      );
    }

    // Get the highest position in the list
    const lastCard = await prisma.card.findFirst({
      where: { listId },
      orderBy: { position: 'desc' },
    });

    const cardType: CardType = type || 'TASK';

    // Initialize type-specific data with defaults, merged with any provided data
    const typeData: Record<string, unknown> = {};
    if (cardType === 'TASK') {
      typeData.taskData = {
        storyPoints: null,
        deadline: null,
        linkedUserStoryId: null,
        linkedEpicId: null,
        ...taskData,
      };
    } else if (cardType === 'USER_STORY') {
      typeData.userStoryData = {
        linkedEpicId: null,
        flags: [],
        ...userStoryData,
      };
    } else if (cardType === 'EPIC') {
      typeData.epicData = { ...epicData };
    } else if (cardType === 'UTILITY') {
      typeData.utilityData = {
        subtype: 'NOTE',
        content: '',
        ...utilityData,
      };
    }

    const card = await prisma.card.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        type: cardType,
        position: (lastCard?.position ?? -1) + 1,
        listId,
        ...typeData,
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

    return NextResponse.json({ success: true, data: card }, { status: 201 });
  } catch (error) {
    console.error('Failed to create card:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create card' } },
      { status: 500 }
    );
  }
}
