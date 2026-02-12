import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import type { TimelineData, BlockType, EventType } from '@/types';

// GET /api/timeline - Get aggregate timeline data for all user's boards
export async function GET() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const [boards, blockTypes, eventTypes, teams, users] = await Promise.all([
      // All authenticated users can see all non-archived boards in timeline
      prisma.board.findMany({
        where: {
          archivedAt: null,
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  userCompanyRoles: {
                    include: {
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
          weeklyAvailability: {
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
          timelineBlocks: {
            include: {
              blockType: true,
              list: {
                select: {
                  id: true,
                  name: true,
                  phase: true,
                },
              },
            },
            orderBy: { startDate: 'asc' },
          },
          timelineEvents: {
            include: {
              eventType: true,
            },
            orderBy: { startDate: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.blockType.findMany({
        orderBy: { position: 'asc' },
      }),
      prisma.eventType.findMany({
        orderBy: { position: 'asc' },
      }),
      prisma.team.findMany({
        where: { archivedAt: null },
        select: {
          id: true,
          name: true,
          color: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const linkedListIds = boards
      .flatMap((board) => board.timelineBlocks.map((block) => block.listId))
      .filter((listId): listId is string => Boolean(listId));

    const uniqueLinkedListIds = Array.from(new Set(linkedListIds));

    const [userStoryGroups, taskCards] = uniqueLinkedListIds.length
      ? await Promise.all([
          prisma.card.groupBy({
            by: ['listId'],
            where: {
              listId: { in: uniqueLinkedListIds },
              type: 'USER_STORY',
              archivedAt: null,
            },
            _count: { _all: true },
          }),
          prisma.card.findMany({
            where: {
              listId: { in: uniqueLinkedListIds },
              type: 'TASK',
              archivedAt: null,
            },
            select: {
              id: true,
              listId: true,
              taskData: true,
              checklists: {
                select: {
                  items: {
                    select: {
                      isComplete: true,
                    },
                  },
                },
              },
            },
          }),
        ])
      : [[], []];

    const metricsByListId = new Map<
      string,
      {
        userStoryCount: number;
        totalStoryPoints: number;
        completedStoryPoints: number;
        completedTaskCount: number;
        taskCount: number;
      }
    >();

    for (const row of userStoryGroups) {
      metricsByListId.set(row.listId, {
        userStoryCount: row._count._all,
        totalStoryPoints: 0,
        completedStoryPoints: 0,
        completedTaskCount: 0,
        taskCount: 0,
      });
    }

    for (const task of taskCards) {
      const existing = metricsByListId.get(task.listId) || {
        userStoryCount: 0,
        totalStoryPoints: 0,
        completedStoryPoints: 0,
        completedTaskCount: 0,
        taskCount: 0,
      };

      const taskData =
        task.taskData && typeof task.taskData === 'object'
          ? (task.taskData as { storyPoints?: unknown })
          : null;
      const storyPoints =
        typeof taskData?.storyPoints === 'number'
          ? Math.max(0, taskData.storyPoints)
          : 0;

      const checklistItems = task.checklists.flatMap((checklist) => checklist.items);
      const isCompleted =
        checklistItems.length > 0 && checklistItems.every((item) => item.isComplete === true);

      existing.taskCount += 1;
      existing.totalStoryPoints += storyPoints;
      if (isCompleted) {
        existing.completedTaskCount += 1;
        existing.completedStoryPoints += storyPoints;
      }

      metricsByListId.set(task.listId, existing);
    }

    const mappedBlockTypes: BlockType[] = blockTypes.map((bt) => ({
      id: bt.id,
      name: bt.name,
      color: bt.color,
      description: bt.description,
      isDefault: bt.isDefault,
      position: bt.position,
    }));

    const mappedEventTypes: EventType[] = eventTypes.map((et) => ({
      id: et.id,
      name: et.name,
      color: et.color,
      icon: et.icon,
      description: et.description,
      isDefault: et.isDefault,
      position: et.position,
    }));

    const projects: TimelineData[] = boards.map((board) => {
      const settings = (board.settings as Record<string, unknown>) || {};
      const rawProjectRoleAssignments = Array.isArray(settings.projectRoleAssignments)
        ? settings.projectRoleAssignments
        : [];

      const projectRoleAssignments = rawProjectRoleAssignments
        .map((row) => {
          if (!row || typeof row !== 'object') return null;
          const item = row as Record<string, unknown>;
          const id = typeof item.id === 'string' ? item.id : null;
          const roleId = typeof item.roleId === 'string' ? item.roleId : null;
          const roleName = typeof item.roleName === 'string' ? item.roleName : null;
          const roleColor = typeof item.roleColor === 'string' ? item.roleColor : null;
          const userId = typeof item.userId === 'string' ? item.userId : null;

          if (!id || !roleId || !roleName || !userId) return null;
          return { id, roleId, roleName, roleColor, userId };
        })
        .filter((row): row is { id: string; roleId: string; roleName: string; roleColor: string | null; userId: string } => Boolean(row));

      return {
        board: {
          id: board.id,
          name: board.name,
          description: board.description,
          teamId: board.teamId,
          team: board.team,
          projectRoleAssignments,
          members: board.members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            image: m.user.image,
            userCompanyRoles: m.user.userCompanyRoles.map((ucr) => ({
              companyRole: {
                id: ucr.companyRole.id,
                name: ucr.companyRole.name,
                color: ucr.companyRole.color,
                position: ucr.companyRole.position,
              },
            })),
          })),
        },
        blocks: board.timelineBlocks.map((block) => ({
          id: block.id,
          startDate: block.startDate.toISOString(),
          endDate: block.endDate.toISOString(),
          position: block.position,
          blockType: {
            id: block.blockType.id,
            name: block.blockType.name,
            color: block.blockType.color,
            description: block.blockType.description,
            isDefault: block.blockType.isDefault,
            position: block.blockType.position,
          },
          list: block.list,
          metrics: block.listId
            ? metricsByListId.get(block.listId) || {
                userStoryCount: 0,
                totalStoryPoints: 0,
                completedStoryPoints: 0,
                completedTaskCount: 0,
                taskCount: 0,
              }
            : undefined,
        })),
        availability: board.weeklyAvailability.map((a) => ({
          id: a.id,
          dedication: a.dedication,
          weekStart: a.weekStart.toISOString(),
          userId: a.userId,
          boardId: a.boardId,
          user: a.user,
        })),
        events: board.timelineEvents.map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          eventType: {
            id: event.eventType.id,
            name: event.eventType.name,
            color: event.eventType.color,
            icon: event.eventType.icon,
            description: event.eventType.description,
            isDefault: event.eventType.isDefault,
            position: event.eventType.position,
          },
        })),
        blockTypes: mappedBlockTypes,
        eventTypes: mappedEventTypes,
      };
    });

    return apiSuccess({
      projects,
      teams,
      users,
      blockTypes: mappedBlockTypes,
      eventTypes: mappedEventTypes,
    });
  } catch (error) {
    console.error('Failed to fetch timeline data:', error);
    return ApiErrors.internal('Failed to fetch timeline data');
  }
}
