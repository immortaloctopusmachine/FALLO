import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import type { CardType, TaskReleaseMode } from '@/types';

const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 10000;
const MAX_BATCH_SIZE = 10;
const VALID_TASK_DESTINATION_MODES: TaskReleaseMode[] = ['IMMEDIATE', 'STAGED'];

function getPreviousFriday(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - 1);
  while (result.getDay() !== 5) {
    result.setDate(result.getDate() - 1);
  }
  return result;
}

// POST /api/boards/[boardId]/cards/batch - Create multiple cards in one request
// Supports dependency chaining: each card can reference the previous card via `dependsOnPrevious: true`
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

    const { cards: cardDefs } = await request.json();

    if (!Array.isArray(cardDefs) || cardDefs.length === 0) {
      return ApiErrors.validation('cards array is required and must not be empty');
    }
    if (cardDefs.length > MAX_BATCH_SIZE) {
      return ApiErrors.validation(`Cannot create more than ${MAX_BATCH_SIZE} cards at once`);
    }

    // Pre-fetch all board lists once (shared across all card validations)
    const boardLists = await prisma.list.findMany({
      where: { boardId },
      select: { id: true, name: true, phase: true, viewType: true, startDate: true },
      orderBy: { position: 'asc' },
    });
    const listById = new Map(boardLists.map(l => [l.id, l]));
    const linkedStoryCache = new Map<
      string,
      {
        list: {
          id: string;
          startDate: Date | null;
          viewType: string;
        };
      } | null
    >();
    const nextPositionByList = new Map<string, number>();

    const getNextPosition = async (listId: string): Promise<number> => {
      const cached = nextPositionByList.get(listId);
      if (cached !== undefined) {
        nextPositionByList.set(listId, cached + 1);
        return cached;
      }

      const lastCard = await prisma.card.findFirst({
        where: { listId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const next = (lastCard?.position ?? -1) + 1;
      nextPositionByList.set(listId, next + 1);
      return next;
    };

    const createdCards = [];
    let previousCardId: string | null = null;

    for (const def of cardDefs) {
      const {
        title,
        listId,
        description,
        color,
        assigneeIds,
        tagIds,
        taskData,
        taskDestination,
      } = def;

      // Validate title
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return ApiErrors.validation('Card title is required');
      }
      if (title.trim().length > MAX_TITLE_LENGTH) {
        return ApiErrors.validation(`Card title cannot exceed ${MAX_TITLE_LENGTH} characters`);
      }
      if (description && typeof description === 'string' && description.length > MAX_DESCRIPTION_LENGTH) {
        return ApiErrors.validation(`Card description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
      }
      if (!listId) {
        return ApiErrors.validation('List ID is required');
      }

      // Validate list belongs to board (in-memory lookup)
      const requestedList = listById.get(listId);
      if (!requestedList) {
        return ApiErrors.notFound('List');
      }

      let targetListId = listId;
      const typeData: Record<string, unknown> = {};
      const linkedUserStoryId = taskData?.linkedUserStoryId ?? null;
      const destinationMode: TaskReleaseMode = taskDestination?.mode || 'IMMEDIATE';

      if (!VALID_TASK_DESTINATION_MODES.includes(destinationMode)) {
        return ApiErrors.validation(`Invalid task destination mode`);
      }

      // Wire up dependency chain
      const dependsOnTaskId = def.dependsOnPrevious ? previousCardId : (taskData?.dependsOnTaskId ?? null);

      if (linkedUserStoryId && destinationMode === 'STAGED') {
        const selectedStagingPlanningListId = taskDestination?.stagingPlanningListId;
        const selectedReleaseTargetListId = taskDestination?.releaseTargetListId;

        // Validate linked story
        let linkedStory = linkedStoryCache.get(linkedUserStoryId);
        if (linkedStory === undefined) {
          linkedStory = await prisma.card.findFirst({
            where: {
              id: linkedUserStoryId,
              type: 'USER_STORY',
              archivedAt: null,
              list: { boardId },
            },
            select: {
              list: {
                select: { id: true, startDate: true, viewType: true },
              },
            },
          });
          linkedStoryCache.set(linkedUserStoryId, linkedStory);
        }

        if (!linkedStory) {
          return ApiErrors.validation('Linked User Story not found in this board');
        }

        let stagingList = linkedStory.list;
        if (selectedStagingPlanningListId) {
          const requested = listById.get(selectedStagingPlanningListId);
          if (!requested || requested.viewType !== 'PLANNING') {
            return ApiErrors.validation('Selected staging planning list was not found in this board');
          }
          stagingList = requested as typeof stagingList;
        }

        if (stagingList.viewType !== 'PLANNING' || !stagingList.startDate) {
          return ApiErrors.validation('Staged tasks require a planning-view staging list with a start date');
        }

        const releaseTargetList = selectedReleaseTargetListId
          ? listById.get(selectedReleaseTargetListId)
          : boardLists.find(l => l.viewType === 'TASKS' && l.phase === 'BACKLOG');

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
          dependsOnTaskId,
          releaseMode: 'STAGED',
          stagedFromPlanningListId: stagingList.id,
          scheduledReleaseDate: scheduledReleaseDate.toISOString(),
          releaseTargetListId: releaseTargetList.id,
          releasedAt: null,
        };
      } else {
        const immediateTargetListId = taskDestination?.immediateListId || listId;
        const immediateTargetList = listById.get(immediateTargetListId);

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
          dependsOnTaskId,
          releaseMode: 'IMMEDIATE',
          releaseTargetListId: immediateTargetList.id,
          stagedFromPlanningListId: null,
          scheduledReleaseDate: null,
          releasedAt: new Date().toISOString(),
        };
      }

      const assigneeConnects = Array.isArray(assigneeIds) && assigneeIds.length > 0
        ? { create: assigneeIds.map((userId: string) => ({ userId })) }
        : undefined;

      const card = await prisma.card.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          type: 'TASK' as CardType,
          position: await getNextPosition(targetListId),
          listId: targetListId,
          color: color || null,
          ...typeData,
          ...(assigneeConnects ? { assignees: assigneeConnects } : {}),
        },
        include: {
          list: { select: { id: true, name: true, phase: true } },
          assignees: {
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
          },
          _count: { select: { attachments: true, comments: true } },
          checklists: { include: { items: true } },
        },
      });

      // Create tag associations
      if (Array.isArray(tagIds) && tagIds.length > 0) {
        const validTagIds = tagIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0);
        if (validTagIds.length > 0) {
          await prisma.cardTag.createMany({
            data: validTagIds.map((tagId: string) => ({ cardId: card.id, tagId })),
            skipDuplicates: true,
          });
        }
      }

      createdCards.push(card);
      previousCardId = card.id;
    }

    return apiSuccess(createdCards, 201);
  } catch (error) {
    console.error('Failed to batch create cards:', error);
    return ApiErrors.internal('Failed to create cards');
  }
}
