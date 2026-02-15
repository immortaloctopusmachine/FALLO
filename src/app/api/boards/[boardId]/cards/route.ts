import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import type { CardType, TaskReleaseMode } from '@/types';

// Validation constants
const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 10000;
const VALID_CARD_TYPES: CardType[] = ['TASK', 'USER_STORY', 'EPIC', 'UTILITY'];
const VALID_TASK_DESTINATION_MODES: TaskReleaseMode[] = ['IMMEDIATE', 'STAGED'];

function getPreviousFriday(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - 1);
  while (result.getDay() !== 5) {
    result.setDate(result.getDate() - 1);
  }
  return result;
}

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
    const {
      title,
      type,
      listId,
      description,
      color,
      assigneeIds,
      tagIds,
      taskData,
      userStoryData,
      epicData,
      utilityData,
      taskDestination,
    } = body;

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

    // Verify provided list belongs to board
    const requestedList = await prisma.list.findFirst({
      where: { id: listId, boardId },
    });

    if (!requestedList) {
      return ApiErrors.notFound('List');
    }

    const cardType: CardType = type || 'TASK';
    let targetListId = listId;

    // Initialize type-specific data with defaults, merged with any provided data
    const typeData: Record<string, unknown> = {};
    if (cardType === 'TASK') {
      const linkedUserStoryId = taskData?.linkedUserStoryId ?? null;
      const destinationMode: TaskReleaseMode = taskDestination?.mode || 'IMMEDIATE';

      if (!VALID_TASK_DESTINATION_MODES.includes(destinationMode)) {
        return ApiErrors.validation(`Invalid task destination mode. Must be one of: ${VALID_TASK_DESTINATION_MODES.join(', ')}`);
      }

      if (linkedUserStoryId && destinationMode === 'STAGED') {
        const selectedStagingPlanningListId = taskDestination?.stagingPlanningListId;
        const selectedReleaseTargetListId = taskDestination?.releaseTargetListId;

        const linkedStory = await prisma.card.findFirst({
          where: {
            id: linkedUserStoryId,
            type: 'USER_STORY',
            archivedAt: null,
            list: { boardId },
          },
          include: {
            list: {
              select: {
                id: true,
                startDate: true,
                viewType: true,
              },
            },
          },
        });

        if (!linkedStory) {
          return ApiErrors.validation('Linked User Story not found in this board');
        }

        let stagingList = linkedStory.list;

        if (selectedStagingPlanningListId) {
          const requestedStagingList = await prisma.list.findFirst({
            where: {
              id: selectedStagingPlanningListId,
              boardId,
              viewType: 'PLANNING',
            },
            select: {
              id: true,
              startDate: true,
              viewType: true,
            },
          });

          if (!requestedStagingList) {
            return ApiErrors.validation('Selected staging planning list was not found in this board');
          }

          stagingList = requestedStagingList;
        }

        if (stagingList.viewType !== 'PLANNING') {
          return ApiErrors.validation('Staged tasks require a planning-view staging list');
        }

        if (!stagingList.startDate) {
          return ApiErrors.validation('Cannot stage task: selected planning list has no start date');
        }

        const releaseTargetList = selectedReleaseTargetListId
          ? await prisma.list.findFirst({
              where: {
                id: selectedReleaseTargetListId,
                boardId,
                viewType: 'TASKS',
              },
              select: { id: true },
            })
          : await prisma.list.findFirst({
              where: {
                boardId,
                viewType: 'TASKS',
                phase: 'BACKLOG',
              },
              orderBy: { position: 'asc' },
              select: { id: true },
            });

        if (!releaseTargetList) {
          return ApiErrors.validation('Cannot stage task: board has no valid Tasks-view target list');
        }

        const scheduledReleaseDate = getPreviousFriday(stagingList.startDate);
        targetListId = stagingList.id;

        typeData.taskData = {
          storyPoints: null,
          deadline: null,
          linkedUserStoryId: null,
          linkedEpicId: null,
          ...taskData,
          releaseMode: 'STAGED',
          stagedFromPlanningListId: stagingList.id,
          scheduledReleaseDate: scheduledReleaseDate.toISOString(),
          releaseTargetListId: releaseTargetList.id,
          releasedAt: null,
        };
      } else {
        const immediateTargetListId = taskDestination?.immediateListId || listId;
        const immediateTargetList = await prisma.list.findFirst({
          where: { id: immediateTargetListId, boardId },
          select: { id: true, viewType: true },
        });

        if (!immediateTargetList) {
          return ApiErrors.validation('Immediate destination list not found in this board');
        }

        if (linkedUserStoryId && immediateTargetList.viewType !== 'TASKS') {
          return ApiErrors.validation('Immediate destination must be a Tasks-view list');
        }

        targetListId = immediateTargetList.id;
        typeData.taskData = {
          storyPoints: null,
          deadline: null,
          linkedUserStoryId: null,
          linkedEpicId: null,
          ...taskData,
          releaseMode: 'IMMEDIATE',
          releaseTargetListId: immediateTargetList.id,
          stagedFromPlanningListId: null,
          scheduledReleaseDate: null,
          releasedAt: new Date().toISOString(),
        };
      }
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

    // Get the highest position in the target list
    const lastCard = await prisma.card.findFirst({
      where: { listId: targetListId },
      orderBy: { position: 'desc' },
    });

    // Build assignee connects if provided
    const assigneeConnects = Array.isArray(assigneeIds) && assigneeIds.length > 0
      ? { create: assigneeIds.map((userId: string) => ({ userId })) }
      : undefined;

    const card = await prisma.card.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        type: cardType,
        position: (lastCard?.position ?? -1) + 1,
        listId: targetListId,
        color: color || null,
        ...typeData,
        ...(assigneeConnects ? { assignees: assigneeConnects } : {}),
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

    // Create tag associations if tagIds provided
    if (Array.isArray(tagIds) && tagIds.length > 0) {
      const validTagIds = tagIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0);
      if (validTagIds.length > 0) {
        await prisma.cardTag.createMany({
          data: validTagIds.map((tagId: string) => ({ cardId: card.id, tagId })),
          skipDuplicates: true,
        });
      }
    }

    return apiSuccess(card, 201);
  } catch (error) {
    console.error('Failed to create card:', error);
    return ApiErrors.internal('Failed to create card');
  }
}
