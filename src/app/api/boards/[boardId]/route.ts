import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  requireAuth,
  requireBoardAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import { setBoardArchivedOnlyAt, setProjectArchivedAt } from '@/lib/project-archive';

// GET /api/boards/[boardId] - Get a single board (scope: light | full | project)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;
    const { searchParams } = new URL(request.url);
    const requestedScope = searchParams.get('scope');
    const scope =
      requestedScope === 'full' || requestedScope === 'project' ? requestedScope : 'light';
    const isLightScope = scope === 'light';

    if (scope === 'project') {
      const board = await prisma.board.findFirst({
        where: {
          id: boardId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          teamId: true,
          settings: true,
          team: {
            select: { id: true, name: true, color: true },
          },
          members: {
            select: {
              id: true,
              userId: true,
              permission: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  userCompanyRoles: {
                    select: {
                      companyRole: {
                        select: {
                          id: true,
                          name: true,
                          color: true,
                          position: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          lists: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              name: true,
              viewType: true,
              phase: true,
              cards: {
                where: { archivedAt: null },
                orderBy: { position: 'asc' },
                select: {
                  id: true,
                  type: true,
                  listId: true,
                  taskData: true,
                  userStoryData: true,
                },
              },
            },
          },
          timelineEvents: {
            orderBy: { startDate: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              startDate: true,
              endDate: true,
              eventType: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  icon: true,
                  description: true,
                  isDefault: true,
                  position: true,
                },
              },
            },
          },
          timelineBlocks: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              startDate: true,
              endDate: true,
              position: true,
              blockType: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  description: true,
                  isDefault: true,
                  position: true,
                },
              },
            },
          },
        },
      });

      if (!board) {
        return ApiErrors.notFound('Board');
      }

      const weeklyProgress = await prisma.weeklyProgress.findMany({
        where: { boardId },
        orderBy: { weekStartDate: 'asc' },
        select: {
          id: true,
          completedPoints: true,
        },
      });

      return NextResponse.json(
        { success: true, data: { ...board, weeklyProgress } },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // All authenticated users can view any board
    // Use explicit `select` at every level to minimise SQL columns fetched.
    // Board structure and cards are fetched in parallel for faster loading.

    const cardSelect = {
      id: true,
      title: true,
      description: true,
      type: true,
      position: true,
      listId: true,
      color: true,
      featureImage: true,
      featureImagePosition: true,
      createdAt: true,
      updatedAt: true,
      taskData: true,
      userStoryData: true,
      epicData: true,
      utilityData: true,
      assignees: {
        select: {
          id: true,
          userId: true,
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
        select: {
          id: true,
          name: true,
          type: true,
          position: true,
          createdAt: true,
          items: isLightScope
            ? { select: { id: true as const, isComplete: true as const } }
            : {
                orderBy: { position: 'asc' as const },
                select: {
                  id: true,
                  content: true,
                  isComplete: true,
                  position: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
        },
      },
    } as const;

    // Run board structure + cards in parallel to halve latency on remote DB
    const [boardBase, allBoardCards] = await Promise.all([
      prisma.board.findFirst({
        where: { id: boardId },
        select: {
          id: true,
          name: true,
          description: true,
          isTemplate: true,
          settings: true,
          teamId: true,
          createdAt: true,
          updatedAt: true,
          archivedAt: true,
          team: {
            select: { id: true, name: true, color: true },
          },
          members: {
            select: {
              id: true,
              userId: true,
              permission: true,
              joinedAt: true,
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
          ...(!isLightScope
            ? {
                timelineEvents: {
                  orderBy: { startDate: 'asc' as const },
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    startDate: true,
                    endDate: true,
                    eventType: {
                      select: {
                        id: true,
                        name: true,
                        color: true,
                        icon: true,
                        description: true,
                        isDefault: true,
                        position: true,
                      },
                    },
                  },
                },
              }
            : {}),
          timelineBlocks: {
            orderBy: { position: 'asc' as const },
            select: {
              id: true,
              startDate: true,
              endDate: true,
              position: true,
              blockType: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  description: true,
                  isDefault: true,
                  position: true,
                },
              },
            },
          },
          lists: {
            orderBy: { position: 'asc' as const },
            select: {
              id: true,
              name: true,
              position: true,
              boardId: true,
              viewType: true,
              phase: true,
              color: true,
              startDate: true,
              endDate: true,
              durationWeeks: true,
              durationDays: true,
              createdAt: true,
              updatedAt: true,
              timelineBlock: {
                select: {
                  id: true,
                  blockType: {
                    select: { name: true, color: true },
                  },
                },
              },
            },
          },
        },
      }),
      // Cards fetched separately in parallel — avoids sequential list→card→relation chain
      prisma.card.findMany({
        where: { list: { boardId }, archivedAt: null },
        orderBy: { position: 'asc' },
        select: cardSelect,
      }),
    ]);

    if (!boardBase) {
      return ApiErrors.notFound('Board');
    }

    // Group cards by listId and merge into lists
    const cardsByList = new Map<string, typeof allBoardCards>();
    for (const card of allBoardCards) {
      const existing = cardsByList.get(card.listId);
      if (existing) {
        existing.push(card);
      } else {
        cardsByList.set(card.listId, [card]);
      }
    }

    const listsWithTimeline = boardBase.lists.map((list) => ({
      ...list,
      cards: cardsByList.get(list.id) || [],
      timelineBlockId: list.timelineBlock?.id || null,
      timelineBlock: list.timelineBlock
        ? {
            id: list.timelineBlock.id,
            blockType: list.timelineBlock.blockType,
          }
        : null,
    }));

    const board = { ...boardBase, lists: listsWithTimeline };

    if (scope === 'light') {
      return NextResponse.json(
        { success: true, data: { ...board, weeklyProgress: [] } },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    const weeklyProgress = await prisma.weeklyProgress.findMany({
      where: { boardId },
      orderBy: { weekStartDate: 'asc' },
    });

    // Collect all cards across all lists, attaching list info to each card
    type CardWithList = typeof listsWithTimeline[0]['cards'][0] & {
      list: { id: string; name: string; phase: string | null };
    };
    const allCards: CardWithList[] = listsWithTimeline.flatMap(list =>
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
    const enhancedLists = listsWithTimeline.map(list => ({
      ...list,
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
            taskCount: totalTasks,
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

    // Check if user is SUPER_ADMIN (can edit any board) or board ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });
    const isSuperAdmin = user?.permission === 'SUPER_ADMIN';

    if (!isSuperAdmin) {
      // Not super admin - must be board admin
      const { response: adminResponse } = await requireBoardAdmin(boardId, session.user.id);
      if (adminResponse) return adminResponse;
    }

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

// DELETE /api/boards/[boardId] - Archive board (or permanently delete with ?permanent=true)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';
    const scope = searchParams.get('scope');

    if (permanent) {
      // Permanent delete: board admin or super admin required, board must be archived
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { permission: true },
      });
      const isSuperAdmin = user?.permission === 'SUPER_ADMIN';

      if (!isSuperAdmin) {
        // Not super admin — check board-level admin
        const { response: adminResponse } = await requireBoardAdmin(boardId, session.user.id);
        if (adminResponse) return adminResponse;
      }

      const board = await prisma.board.findUnique({
        where: { id: boardId },
        select: { archivedAt: true },
      });

      if (!board) {
        return ApiErrors.notFound('Board');
      }

      if (!board.archivedAt) {
        return ApiErrors.validation('Only archived boards can be permanently deleted');
      }

      // Explicit cleanup keeps permanent delete reliable even if DB cascade
      // constraints differ across environments/migrations.
      await prisma.$transaction(async (tx) => {
        // Phase 1: Delete all independent records in parallel
        // (timeLog must be deleted before lists due to FK on listId)
        await Promise.all([
          tx.timeLog.deleteMany({
            where: {
              OR: [
                { list: { boardId } },
                { card: { list: { boardId } } },
              ],
            },
          }),
          tx.userWeeklyAvailability.deleteMany({ where: { boardId } }),
          tx.timelineEvent.deleteMany({ where: { boardId } }),
          tx.timelineBlock.deleteMany({ where: { boardId } }),
          tx.weeklyProgress.deleteMany({ where: { boardId } }),
          tx.activity.deleteMany({ where: { boardId } }),
          tx.boardMember.deleteMany({ where: { boardId } }),
          tx.spineTrackerData.deleteMany({ where: { boardId } }),
        ]);
        // Phase 2: Delete lists (cascades to cards and card children)
        await tx.list.deleteMany({ where: { boardId } });
        // Phase 3: Delete the board itself
        await tx.board.delete({ where: { id: boardId } });
      }, { timeout: 30000 });

      return apiSuccess(null);
    }

    // Soft delete (archive)
    const { response: adminResponse } = await requireBoardAdmin(boardId, session.user.id);
    if (adminResponse) return adminResponse;

    const archiveDate = new Date();
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        settings: true,
      },
    });

    if (!board) {
      return ApiErrors.notFound('Board');
    }

    if (scope === 'project') {
      await prisma.board.update({
        where: { id: boardId },
        data: {
          archivedAt: archiveDate,
          settings: setProjectArchivedAt(board.settings, archiveDate),
        },
      });
    } else {
      await prisma.board.update({
        where: { id: boardId },
        data: {
          archivedAt: archiveDate,
          settings: setBoardArchivedOnlyAt(board.settings, archiveDate),
        },
      });
    }

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete board:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return ApiErrors.notFound('Board');
      }
      if (error.code === 'P2003') {
        return ApiErrors.conflict('Board cannot be deleted due to related records');
      }
      return ApiErrors.internal(`Delete failed (${error.code})`);
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return ApiErrors.validation('Invalid delete request');
    }

    return ApiErrors.internal('Failed to delete board');
  }
}
