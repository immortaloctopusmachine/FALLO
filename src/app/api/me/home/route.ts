import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { parseBoardArchivedOnlyAt, parseProjectArchivedAt } from '@/lib/project-archive';
import { getQualityAccessContext } from '@/lib/quality-review-api';

const DUE_SOON_DAYS = 7;

function parseOptionalDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isTaskInDoneList(phase: string | null): boolean {
  return phase === 'DONE';
}

function readStringSetting(settings: unknown, key: string): string | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
  const value = (settings as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

// GET /api/me/home - Personalized home summary for current user
export async function GET() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const userId = session.user.id;
    const now = new Date();
    const dueSoonThreshold = new Date(now);
    dueSoonThreshold.setDate(dueSoonThreshold.getDate() + DUE_SOON_DAYS);

    const [access, boardMemberships, taskAssignments, notifications, unreadNotifications] =
      await Promise.all([
        getQualityAccessContext(prisma, userId),
        prisma.boardMember.findMany({
          where: {
            userId,
            board: {
              isTemplate: false,
            },
          },
          orderBy: {
            joinedAt: 'desc',
          },
          select: {
            permission: true,
            board: {
              select: {
                id: true,
                name: true,
                description: true,
                archivedAt: true,
                settings: true,
                updatedAt: true,
                team: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
                _count: {
                  select: {
                    members: true,
                    lists: true,
                  },
                },
              },
            },
          },
        }),
        prisma.cardUser.findMany({
          where: {
            userId,
            card: {
              type: 'TASK',
              archivedAt: null,
              list: {
                board: {
                  isTemplate: false,
                  archivedAt: null,
                },
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
          take: 40,
          select: {
            assignedAt: true,
            card: {
              select: {
                id: true,
                title: true,
                updatedAt: true,
                taskData: true,
                list: {
                  select: {
                    id: true,
                    name: true,
                    phase: true,
                    viewType: true,
                    boardId: true,
                    board: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.notification.findMany({
          where: {
            userId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 8,
          select: {
            id: true,
            type: true,
            title: true,
            message: true,
            read: true,
            createdAt: true,
            data: true,
          },
        }),
        prisma.notification.count({
          where: {
            userId,
            read: false,
          },
        }),
      ]);

    const pendingEvaluationsPromise =
      access && access.evaluatorRoles.length > 0
        ? prisma.reviewCycle.findMany({
            where: {
              lockedAt: null,
              card: {
                archivedAt: null,
              },
              evaluations: {
                none: {
                  reviewerId: userId,
                },
              },
            },
            orderBy: {
              openedAt: 'desc',
            },
            take: 6,
            select: {
              id: true,
              cycleNumber: true,
              openedAt: true,
              card: {
                select: {
                  id: true,
                  title: true,
                  list: {
                    select: {
                      boardId: true,
                      board: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]);

    const pendingEvaluationCountPromise =
      access && access.evaluatorRoles.length > 0
        ? prisma.reviewCycle.count({
            where: {
              lockedAt: null,
              card: {
                archivedAt: null,
              },
              evaluations: {
                none: {
                  reviewerId: userId,
                },
              },
            },
          })
        : Promise.resolve(0);

    const [pendingEvaluationItems, pendingEvaluationCount] = await Promise.all([
      pendingEvaluationsPromise,
      pendingEvaluationCountPromise,
    ]);

    const myBoards = boardMemberships
      .filter((membership) => {
        const settings = membership.board.settings;
        const isBoardArchivedOnly = Boolean(parseBoardArchivedOnlyAt(settings));
        const isProjectArchived =
          Boolean(parseProjectArchivedAt(settings))
          || (Boolean(membership.board.archivedAt) && !isBoardArchivedOnly);
        return !isProjectArchived;
      })
      .map((membership) => ({
        id: membership.board.id,
        name: membership.board.name,
        description: membership.board.description,
        permission: membership.permission,
        updatedAt: membership.board.updatedAt.toISOString(),
        team: membership.board.team,
        memberCount: membership.board._count.members,
        listCount: membership.board._count.lists,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const myProjects = myBoards
      .map((board) => {
        const sourceSettings = boardMemberships.find((membership) => membership.board.id === board.id)?.board.settings;
        const productionTitle = readStringSetting(sourceSettings, 'productionTitle');
        return {
          id: board.id,
          name: board.name,
          productionTitle,
          team: board.team,
          updatedAt: board.updatedAt,
        };
      })
      .slice(0, 8);

    const myTasks = taskAssignments
      .map((assignment) => {
        const taskData =
          assignment.card.taskData && typeof assignment.card.taskData === 'object' && !Array.isArray(assignment.card.taskData)
            ? (assignment.card.taskData as Record<string, unknown>)
            : {};
        const deadline = parseOptionalDate(taskData.deadline);
        const storyPoints =
          typeof taskData.storyPoints === 'number'
            ? taskData.storyPoints
            : null;
        const blocked = Array.isArray(taskData.flags) && taskData.flags.includes('BLOCKED');
        const completed = isTaskInDoneList(assignment.card.list.phase);

        return {
          id: assignment.card.id,
          title: assignment.card.title,
          boardId: assignment.card.list.boardId,
          boardName: assignment.card.list.board.name,
          listId: assignment.card.list.id,
          listName: assignment.card.list.name,
          listPhase: assignment.card.list.phase,
          updatedAt: assignment.card.updatedAt.toISOString(),
          assignedAt: assignment.assignedAt.toISOString(),
          deadline: deadline ? deadline.toISOString() : null,
          dueSoon: Boolean(deadline && deadline <= dueSoonThreshold),
          overdue: Boolean(deadline && deadline < now),
          blocked,
          completed,
          storyPoints,
        };
      })
      .filter((task) => !task.completed)
      .sort((a, b) => {
        if (a.deadline && b.deadline) {
          return a.deadline.localeCompare(b.deadline);
        }
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      })
      .slice(0, 12);

    const dueSoonCount = myTasks.filter((task) => task.dueSoon).length;
    const overdueCount = myTasks.filter((task) => task.overdue).length;

    const evaluatorRoles = access?.evaluatorRoles ?? [];
    const suggestedRoutes = new Set<string>(['/boards']);
    if (evaluatorRoles.includes('PO') || evaluatorRoles.includes('HEAD_OF_ART')) {
      suggestedRoutes.add('/timeline');
      suggestedRoutes.add('/projects');
    }
    if (evaluatorRoles.includes('LEAD')) {
      suggestedRoutes.add('/boards');
      suggestedRoutes.add('/projects');
    }

    return apiSuccess({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        permission: session.user.permission,
        evaluatorRoles,
      },
      stats: {
        myTaskCount: myTasks.length,
        myBoardCount: myBoards.length,
        myProjectCount: myProjects.length,
        unreadNotifications,
        pendingEvaluations: pendingEvaluationCount,
        dueSoonCount,
        overdueCount,
      },
      myTasks,
      myBoards: myBoards.slice(0, 10),
      myProjects,
      pendingEvaluations: pendingEvaluationItems.map((cycle) => ({
        id: cycle.id,
        cycleNumber: cycle.cycleNumber,
        openedAt: cycle.openedAt.toISOString(),
        cardId: cycle.card.id,
        cardTitle: cycle.card.title,
        boardId: cycle.card.list.boardId,
        boardName: cycle.card.list.board.name,
      })),
      notifications: notifications.map((notification) => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      })),
      suggestedRoutes: Array.from(suggestedRoutes),
    });
  } catch (error) {
    console.error('Failed to fetch home summary:', error);
    return ApiErrors.internal('Failed to fetch home summary');
  }
}
