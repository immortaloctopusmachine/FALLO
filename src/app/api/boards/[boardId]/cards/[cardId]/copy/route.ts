import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import { generateVersionedTitle } from '@/lib/task-presets';

interface TaskCardData {
  storyPoints?: number | null;
  deadline?: string | null;
  linkedUserStoryId?: string | null;
  linkedEpicId?: string | null;
  dependsOnTaskId?: string | null;
  versionOfCardId?: string | null;
  releaseMode?: string;
  stagedFromPlanningListId?: string | null;
  scheduledReleaseDate?: string | null;
  releaseTargetListId?: string | null;
  releasedAt?: string | null;
  approvedByPo?: Record<string, string> | null;
  approvedByLead?: Record<string, string> | null;
  [key: string]: string | number | boolean | null | undefined | Record<string, string>;
}

// POST /api/boards/[boardId]/cards/[cardId]/copy - Copy a task card
// Creates a versioned copy linked to the original via versionOfCardId
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, cardId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const body = await request.json();
    const { listId, assigneeId } = body;
    const normalizedListId = typeof listId === 'string' ? listId.trim() : '';
    const normalizedAssigneeId =
      typeof assigneeId === 'string' && assigneeId.trim().length > 0
        ? assigneeId.trim()
        : null;

    if (!normalizedListId) {
      return ApiErrors.validation('Target list ID is required');
    }
    if (assigneeId !== undefined && assigneeId !== null && typeof assigneeId !== 'string') {
      return ApiErrors.validation('Assignee ID must be a string');
    }

    // Validate target list belongs to this board
    const targetList = await prisma.list.findFirst({
      where: { id: normalizedListId, boardId },
      select: { id: true },
    });

    if (!targetList) {
      return ApiErrors.notFound('List');
    }

    if (normalizedAssigneeId) {
      const assigneeMembership = await prisma.boardMember.findFirst({
        where: { boardId, userId: normalizedAssigneeId },
        select: { id: true },
      });
      if (!assigneeMembership) {
        return ApiErrors.validation('Assignee must be a board member');
      }
    }

    // Fetch original card with checklists
    const original = await prisma.card.findFirst({
      where: {
        id: cardId,
        type: 'TASK',
        list: { boardId },
        archivedAt: null,
      },
      include: {
        checklists: {
          include: {
            items: {
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!original) {
      return ApiErrors.notFound('Card');
    }

    const originalTaskData = (original.taskData as TaskCardData) || {};

    // Generate versioned title
    const newTitle = generateVersionedTitle(original.title);

    // Run everything in a transaction for atomicity
    const newCard = await prisma.$transaction(async (tx) => {
      const lastCard = await tx.card.findFirst({
        where: { listId: normalizedListId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      return tx.card.create({
        data: {
          title: newTitle,
          description: original.description,
          type: 'TASK',
          position: (lastCard?.position ?? -1) + 1,
          listId: normalizedListId,
          color: original.color,
          taskData: {
            storyPoints: originalTaskData.storyPoints ?? null,
            deadline: null,
            linkedUserStoryId: originalTaskData.linkedUserStoryId ?? null,
            linkedEpicId: originalTaskData.linkedEpicId ?? null,
            dependsOnTaskId: null,
            versionOfCardId: originalTaskData.versionOfCardId || original.id,
            releaseMode: 'IMMEDIATE',
            stagedFromPlanningListId: null,
            scheduledReleaseDate: null,
            releaseTargetListId: null,
            releasedAt: null,
          },
          ...(normalizedAssigneeId
            ? {
                assignees: { create: [{ userId: normalizedAssigneeId }] },
              }
            : {}),
          ...(original.checklists.length > 0
            ? {
                checklists: {
                  create: original.checklists.map((checklist) => ({
                    name: checklist.name,
                    type: checklist.type,
                    position: checklist.position,
                    items: {
                      create: checklist.items.map((item) => ({
                        content: item.content,
                        isComplete: false,
                        position: item.position,
                      })),
                    },
                  })),
                },
              }
            : {}),
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
                  permission: true,
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
              items: {
                orderBy: { position: 'asc' },
              },
            },
            orderBy: { position: 'asc' },
          },
        },
      });
    });

    return apiSuccess(newCard, 201);
  } catch (error) {
    console.error('Failed to copy card:', error);
    return ApiErrors.internal('Failed to copy card');
  }
}
