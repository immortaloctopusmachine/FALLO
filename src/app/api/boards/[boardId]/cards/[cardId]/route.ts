import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// Validation constants
const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 10000;

// GET /api/boards/[boardId]/cards/[cardId] - Get card details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, cardId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

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
      return ApiErrors.notFound('Card');
    }

    // For User Story cards, fetch connected tasks and compute stats
    if (card.type === 'USER_STORY') {
      const connectedTasks = await prisma.card.findMany({
        where: {
          type: 'TASK',
          archivedAt: null,
          list: { boardId },
          taskData: {
            path: ['linkedUserStoryId'],
            equals: cardId,
          },
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
                  image: true,
                },
              },
            },
          },
          checklists: {
            include: {
              items: true,
            },
          },
        },
        orderBy: { position: 'asc' },
      });

      // Calculate completion percentage based on task completion
      const totalTasks = connectedTasks.length;
      const completedTasks = connectedTasks.filter(task => {
        // A task is "complete" if it has checklists and all items are done,
        // OR if it's in a "done" list (we'd need list info for that)
        // For now, use checklist completion
        const checklistItems = task.checklists?.flatMap(cl => cl.items) || [];
        return checklistItems.length > 0 && checklistItems.every(item => item.isComplete);
      }).length;

      const completionPercentage = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      // Calculate total story points
      const totalStoryPoints = connectedTasks.reduce((sum, task) => {
        const taskData = task.taskData as { storyPoints?: number } | null;
        return sum + (taskData?.storyPoints || 0);
      }, 0);

      return NextResponse.json(
        {
          success: true,
          data: {
            ...card,
            connectedTasks,
            completionPercentage,
            totalStoryPoints,
          }
        },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // For Epic cards, fetch connected user stories and compute stats
    if (card.type === 'EPIC') {
      const connectedUserStories = await prisma.card.findMany({
        where: {
          type: 'USER_STORY',
          archivedAt: null,
          list: { boardId },
          userStoryData: {
            path: ['linkedEpicId'],
            equals: cardId,
          },
        },
        orderBy: { position: 'asc' },
      });

      // Get all tasks connected to these user stories
      const storyIds = new Set(connectedUserStories.map(s => s.id));
      const allTasks = storyIds.size > 0 ? await prisma.card.findMany({
        where: {
          type: 'TASK',
          archivedAt: null,
          list: { boardId },
        },
        include: {
          checklists: {
            include: {
              items: true,
            },
          },
        },
      }) : [];

      // Filter to tasks linked to our user stories
      const connectedTasks = allTasks.filter(task => {
        const taskData = task.taskData as { linkedUserStoryId?: string } | null;
        return taskData?.linkedUserStoryId && storyIds.has(taskData.linkedUserStoryId);
      });

      // Calculate overall progress
      const totalTasks = connectedTasks.length;
      const completedTasks = connectedTasks.filter(task => {
        const checklistItems = task.checklists?.flatMap(cl => cl.items) || [];
        return checklistItems.length > 0 && checklistItems.every(item => item.isComplete);
      }).length;

      const overallProgress = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      // Calculate total story points
      const totalStoryPoints = connectedTasks.reduce((sum, task) => {
        const taskData = task.taskData as { storyPoints?: number } | null;
        return sum + (taskData?.storyPoints || 0);
      }, 0);

      return NextResponse.json(
        {
          success: true,
          data: {
            ...card,
            connectedUserStories,
            storyCount: connectedUserStories.length,
            overallProgress,
            totalStoryPoints,
          }
        },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    return NextResponse.json(
      { success: true, data: card },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Failed to fetch card:', error);
    return ApiErrors.internal('Failed to fetch card');
  }
}

// PATCH /api/boards/[boardId]/cards/[cardId] - Update card
export async function PATCH(
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
    const { title, description, position, listId, color, featureImage, featureImagePosition, taskData, userStoryData, epicData, utilityData } = body;

    // Validate title if provided
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return ApiErrors.validation('Card title cannot be empty');
      }
      if (title.trim().length > MAX_TITLE_LENGTH) {
        return ApiErrors.validation(`Card title cannot exceed ${MAX_TITLE_LENGTH} characters`);
      }
    }

    // Validate description length if provided
    if (description && typeof description === 'string' && description.length > MAX_DESCRIPTION_LENGTH) {
      return ApiErrors.validation(`Card description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
    }

    const card = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(position !== undefined && { position }),
        ...(listId && { listId }),
        ...(color !== undefined && { color }),
        ...(featureImage !== undefined && { featureImage }),
        ...(featureImagePosition !== undefined && { featureImagePosition }),
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

    return apiSuccess(card);
  } catch (error) {
    console.error('Failed to update card:', error);
    return ApiErrors.internal('Failed to update card');
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId] - Archive card
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, cardId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    await prisma.card.update({
      where: { id: cardId },
      data: { archivedAt: new Date() },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete card:', error);
    return ApiErrors.internal('Failed to delete card');
  }
}
