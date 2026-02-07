import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import type { CardType } from '@/types';

// Validation constants
const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 10000;
const VALID_CARD_TYPES: CardType[] = ['TASK', 'USER_STORY', 'EPIC', 'UTILITY'];

// POST /api/boards/[boardId]/cards - Create a new card
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const body = await request.json();
    const { title, type, listId, description, taskData, userStoryData, epicData, utilityData } = body;

    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return ApiErrors.validation('Card title is required');
    }
    if (title.trim().length > MAX_TITLE_LENGTH) {
      return ApiErrors.validation(`Card title cannot exceed ${MAX_TITLE_LENGTH} characters`);
    }

    // Validate description length if provided
    if (description && typeof description === 'string' && description.length > MAX_DESCRIPTION_LENGTH) {
      return ApiErrors.validation(`Card description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
    }

    // Validate card type if provided
    if (type && !VALID_CARD_TYPES.includes(type)) {
      return ApiErrors.validation(`Invalid card type. Must be one of: ${VALID_CARD_TYPES.join(', ')}`);
    }

    if (!listId) {
      return ApiErrors.validation('List ID is required');
    }

    // Verify list belongs to board
    const list = await prisma.list.findFirst({
      where: { id: listId, boardId },
    });

    if (!list) {
      return ApiErrors.notFound('List');
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
        list: {
          select: {
            id: true,
            name: true,
            phase: true,
          },
        },
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

    return apiSuccess(card, 201);
  } catch (error) {
    console.error('Failed to create card:', error);
    return ApiErrors.internal('Failed to create card');
  }
}
