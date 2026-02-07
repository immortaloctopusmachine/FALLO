import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId] - Get a single board with all details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    const [board, weeklyProgress] = await Promise.all([
      prisma.board.findFirst({
      where: {
        id: boardId,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        members: {
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
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              where: { archivedAt: null },
              orderBy: { position: 'asc' },
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
            },
            // Include timeline block relation for sync indicator
            timelineBlock: {
              select: {
                id: true,
                blockType: {
                  select: {
                    name: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      }
      }),
      prisma.weeklyProgress.findMany({
        where: { boardId },
        orderBy: { weekStartDate: 'asc' },
      }),
    ]);

    if (!board) {
      return ApiErrors.notFound('Board');
    }

    // Collect all cards across all lists, attaching list info to each card
    type CardWithList = typeof board.lists[0]['cards'][0] & {
      list: { id: string; name: string; phase: string | null };
    };
    const allCards: CardWithList[] = board.lists.flatMap(list =>
      list.cards.map(card => ({
        ...card,
        list: { id: list.id, name: list.name, phase: list.phase },
      }))
    );

    // Create a map of user story ID -> connected tasks for computing stats
    const tasksByUserStory = new Map<string, CardWithList[]>();
    const userStoriesByEpic = new Map<string, CardWithList[]>();

    allCards.forEach(card => {
      if (card.type === 'TASK') {
        const taskData = card.taskData as { linkedUserStoryId?: string } | null;
        if (taskData?.linkedUserStoryId) {
          const existing = tasksByUserStory.get(taskData.linkedUserStoryId) || [];
          existing.push(card);
          tasksByUserStory.set(taskData.linkedUserStoryId, existing);
        }
      }
      if (card.type === 'USER_STORY') {
        const userStoryData = card.userStoryData as { linkedEpicId?: string } | null;
        if (userStoryData?.linkedEpicId) {
          const existing = userStoriesByEpic.get(userStoryData.linkedEpicId) || [];
          existing.push(card);
          userStoriesByEpic.set(userStoryData.linkedEpicId, existing);
        }
      }
    });

    // Helper function to check if a task is complete (all checklist items done)
    const isTaskComplete = (task: typeof allCards[0]) => {
      const checklistItems = task.checklists?.flatMap(cl => cl.items) || [];
      return checklistItems.length > 0 && checklistItems.every(item => item.isComplete);
    };

    // Enhance cards with computed stats and include timeline block info
    const enhancedLists = board.lists.map(list => ({
      ...list,
      // Add timeline block info for sync indicator
      timelineBlockId: list.timelineBlock?.id || null,
      timelineBlock: list.timelineBlock ? {
        id: list.timelineBlock.id,
        blockType: list.timelineBlock.blockType,
      } : null,
      cards: list.cards.map(card => {
        if (card.type === 'USER_STORY') {
          const connectedTasks = tasksByUserStory.get(card.id) || [];
          const totalTasks = connectedTasks.length;
          const completedTasks = connectedTasks.filter(isTaskComplete).length;
          const completionPercentage = totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100)
            : 0;
          const totalStoryPoints = connectedTasks.reduce((sum, task) => {
            const taskData = task.taskData as { storyPoints?: number } | null;
            return sum + (taskData?.storyPoints || 0);
          }, 0);

          return {
            ...card,
            connectedTasks,
            completionPercentage,
            totalStoryPoints,
          };
        }

        if (card.type === 'EPIC') {
          const connectedUserStories = userStoriesByEpic.get(card.id) || [];
          // Get all tasks from connected user stories
          const allConnectedTasks = connectedUserStories.flatMap(
            story => tasksByUserStory.get(story.id) || []
          );
          const totalTasks = allConnectedTasks.length;
          const completedTasks = allConnectedTasks.filter(isTaskComplete).length;
          const overallProgress = totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100)
            : 0;
          const totalStoryPoints = allConnectedTasks.reduce((sum, task) => {
            const taskData = task.taskData as { storyPoints?: number } | null;
            return sum + (taskData?.storyPoints || 0);
          }, 0);

          return {
            ...card,
            connectedUserStories,
            storyCount: connectedUserStories.length,
            overallProgress,
            totalStoryPoints,
          };
        }

        return card;
      }),
    }));

    return NextResponse.json(
      { success: true, data: { ...board, lists: enhancedLists, weeklyProgress } },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch board:', error);
    return ApiErrors.internal('Failed to fetch board');
  }
}

// PATCH /api/boards/[boardId] - Update board
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    const { response: adminResponse } = await requireBoardAdmin(boardId, session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { name, description, settings, teamId } = body;

    const board = await prisma.board.update({
      where: { id: boardId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(settings && { settings }),
        ...(teamId !== undefined && { teamId: teamId || null }),
      },
    });

    return apiSuccess(board);
  } catch (error) {
    console.error('Failed to update board:', error);
    return ApiErrors.internal('Failed to update board');
  }
}

// DELETE /api/boards/[boardId] - Archive board
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    const { response: adminResponse } = await requireBoardAdmin(boardId, session.user.id);
    if (adminResponse) return adminResponse;

    await prisma.board.update({
      where: { id: boardId },
      data: { archivedAt: new Date() },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete board:', error);
    return ApiErrors.internal('Failed to delete board');
  }
}
