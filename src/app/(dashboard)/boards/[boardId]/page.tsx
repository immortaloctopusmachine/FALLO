import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BoardViewWrapper } from '@/components/boards/BoardViewWrapper';
import type { Board, Card, List, WeeklyProgress } from '@/types';

// Disable caching to ensure fresh data on each load
export const dynamic = 'force-dynamic';

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const session = await auth();
  const { boardId } = await params;

  if (!session) {
    redirect('/login');
  }

  // Fetch board data with all lists and cards
  const [boardData, weeklyProgressData] = await Promise.all([
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
            // Include timeline block relation
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
      },
    }),
    // Fetch weekly progress data for burn-up charts
    prisma.weeklyProgress.findMany({
      where: { boardId },
      orderBy: { weekStartDate: 'asc' },
    }),
  ]);

  if (!boardData) {
    notFound();
  }

  // Collect all cards across all lists for computing relationships
  const allCards = boardData.lists.flatMap(list => list.cards);

  // Create maps for linked cards
  const tasksByUserStory = new Map<string, typeof allCards>();
  const userStoriesByEpic = new Map<string, typeof allCards>();

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

  // Helper function to check if a task is complete
  const isTaskComplete = (task: typeof allCards[0]) => {
    const checklistItems = task.checklists?.flatMap(cl => cl.items) || [];
    return checklistItems.length > 0 && checklistItems.every(item => item.isComplete);
  };

  // Transform the data to match our types
  const board: Board = {
    id: boardData.id,
    name: boardData.name,
    description: boardData.description,
    isTemplate: boardData.isTemplate,
    settings: boardData.settings as Board['settings'],
    createdAt: boardData.createdAt.toISOString(),
    updatedAt: boardData.updatedAt.toISOString(),
    archivedAt: boardData.archivedAt?.toISOString() || null,
    members: boardData.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      user: {
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
        image: m.user.image,
        permission: m.user.permission as 'VIEWER' | 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN',
      },
      permission: m.permission as 'VIEWER' | 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN',
      joinedAt: m.joinedAt.toISOString(),
    })),
    lists: boardData.lists.map((list) => ({
      id: list.id,
      name: list.name,
      position: list.position,
      boardId: list.boardId,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
      // View-specific fields
      viewType: list.viewType as 'TASKS' | 'PLANNING',
      phase: list.phase as 'BACKLOG' | 'SPINE_PROTOTYPE' | 'CONCEPT' | 'PRODUCTION' | 'TWEAK' | 'DONE' | null,
      color: list.color,
      startDate: list.startDate?.toISOString() || null,
      endDate: list.endDate?.toISOString() || null,
      durationWeeks: list.durationWeeks,
      // Timeline sync
      timelineBlockId: list.timelineBlock?.id || null,
      timelineBlock: list.timelineBlock ? {
        id: list.timelineBlock.id,
        blockType: list.timelineBlock.blockType,
      } : null,
      cards: list.cards.map((card) => {
        // Base card data
        const baseCard = {
          id: card.id,
          type: card.type as Card['type'],
          title: card.title,
          description: card.description,
          position: card.position,
          color: card.color,
          featureImage: card.featureImage,
          featureImagePosition: card.featureImagePosition,
          listId: card.listId,
          parentId: card.parentId,
          createdAt: card.createdAt.toISOString(),
          updatedAt: card.updatedAt.toISOString(),
          archivedAt: card.archivedAt?.toISOString() || null,
          taskData: card.taskData as unknown,
          userStoryData: card.userStoryData as unknown,
          epicData: card.epicData as unknown,
          utilityData: card.utilityData as unknown,
          assignees: card.assignees.map((a) => ({
            id: a.id,
            userId: a.userId,
            user: {
              id: a.user.id,
              email: a.user.email,
              name: a.user.name,
              image: a.user.image,
              permission: 'MEMBER' as const,
            },
            assignedAt: a.assignedAt.toISOString(),
          })),
          checklists: card.checklists.map((cl) => ({
            id: cl.id,
            name: cl.name,
            type: cl.type as 'todo' | 'feedback',
            position: cl.position,
            items: cl.items.map((item) => ({
              id: item.id,
              content: item.content,
              isComplete: item.isComplete,
              position: item.position,
            })),
          })),
          _count: card._count,
        };

        // Add computed stats for User Story cards
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
            ...baseCard,
            connectedTasks,
            completionPercentage,
            totalStoryPoints,
          };
        }

        // Add computed stats for Epic cards
        if (card.type === 'EPIC') {
          const connectedUserStories = userStoriesByEpic.get(card.id) || [];
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
            ...baseCard,
            connectedUserStories,
            storyCount: connectedUserStories.length,
            overallProgress,
            totalStoryPoints,
          };
        }

        return baseCard;
      }) as Card[],
    })) as List[],
  };

  // Transform weekly progress data
  const weeklyProgress: WeeklyProgress[] = weeklyProgressData.map((wp) => ({
    id: wp.id,
    weekStartDate: wp.weekStartDate.toISOString(),
    totalStoryPoints: wp.totalStoryPoints,
    completedPoints: wp.completedPoints,
    tasksCompleted: wp.tasksCompleted,
    tasksTotal: wp.tasksTotal,
    createdAt: wp.createdAt.toISOString(),
  }));

  // Check if current user is admin
  const currentMember = boardData.members.find((m) => m.userId === session.user.id);
  const isAdmin = currentMember?.permission === 'ADMIN' || currentMember?.permission === 'SUPER_ADMIN';

  return (
    <BoardViewWrapper
      board={board}
      currentUserId={session.user.id}
      weeklyProgress={weeklyProgress}
      isAdmin={isAdmin}
    />
  );
}
