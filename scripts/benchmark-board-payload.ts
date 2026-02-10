import { performance } from 'node:perf_hooks';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Args = {
  boardId?: string;
  iterations: number;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Args = { iterations: 5 };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (/^\d+$/.test(arg)) {
      const n = Number(arg);
      if (Number.isFinite(n) && n > 0) {
        parsed.iterations = Math.floor(n);
      }
      continue;
    }
    if (arg === '--boardId' && args[i + 1]) {
      parsed.boardId = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--iterations' && args[i + 1]) {
      const n = Number(args[i + 1]);
      if (Number.isFinite(n) && n > 0) {
        parsed.iterations = Math.floor(n);
      }
      i += 1;
    }
  }

  return parsed;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function formatMs(ms: number): string {
  return `${ms.toFixed(2)}ms`;
}

function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function isTaskComplete(task: { checklists?: { items: { isComplete: boolean }[] }[] }): boolean {
  const checklistItems = task.checklists?.flatMap((cl) => cl.items) || [];
  return checklistItems.length > 0 && checklistItems.every((item) => item.isComplete);
}

async function runLight(boardId: string) {
  const t0 = performance.now();
  const board = await prisma.board.findFirst({
    where: { id: boardId },
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
                select: {
                  id: true,
                  name: true,
                  type: true,
                  position: true,
                  createdAt: true,
                  items: {
                    select: {
                      id: true,
                      isComplete: true,
                    },
                  },
                },
              },
            },
          },
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
  });

  if (!board) {
    throw new Error(`Board not found: ${boardId}`);
  }

  const listsWithTimeline = board.lists.map((list) => ({
    ...list,
    timelineBlockId: list.timelineBlock?.id || null,
    timelineBlock: list.timelineBlock
      ? {
          id: list.timelineBlock.id,
          blockType: list.timelineBlock.blockType,
        }
      : null,
  }));

  const payload = { success: true, data: { ...board, lists: listsWithTimeline, weeklyProgress: [] } };
  const bytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  const t1 = performance.now();

  return {
    elapsedMs: t1 - t0,
    bytes,
    listCount: board.lists.length,
    cardCount: board.lists.reduce((sum, list) => sum + list.cards.length, 0),
  };
}

async function runFull(boardId: string) {
  const t0 = performance.now();
  const board = await prisma.board.findFirst({
    where: { id: boardId },
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
  });

  if (!board) {
    throw new Error(`Board not found: ${boardId}`);
  }

  const weeklyProgress = await prisma.weeklyProgress.findMany({
    where: { boardId },
    orderBy: { weekStartDate: 'asc' },
  });

  type CardWithList = (typeof board.lists)[number]['cards'][number] & {
    list: { id: string; name: string; phase: string | null };
  };

  const listsWithTimeline = board.lists.map((list) => ({
    ...list,
    timelineBlockId: list.timelineBlock?.id || null,
    timelineBlock: list.timelineBlock
      ? {
          id: list.timelineBlock.id,
          blockType: list.timelineBlock.blockType,
        }
      : null,
  }));

  const allCards: CardWithList[] = listsWithTimeline.flatMap((list) =>
    list.cards.map((card) => ({
      ...card,
      list: { id: list.id, name: list.name, phase: list.phase },
    }))
  );

  const tasksByUserStory = new Map<string, CardWithList[]>();
  const userStoriesByEpic = new Map<string, CardWithList[]>();

  allCards.forEach((card) => {
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

  const enhancedLists = listsWithTimeline.map((list) => ({
    ...list,
    cards: list.cards.map((card) => {
      if (card.type === 'USER_STORY') {
        const connectedTasks = tasksByUserStory.get(card.id) || [];
        const totalTasks = connectedTasks.length;
        const completedTasks = connectedTasks.filter(isTaskComplete).length;
        const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
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
        const allConnectedTasks = connectedUserStories.flatMap(
          (story) => tasksByUserStory.get(story.id) || []
        );
        const totalTasks = allConnectedTasks.length;
        const completedTasks = allConnectedTasks.filter(isTaskComplete).length;
        const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
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

  const payload = { success: true, data: { ...board, lists: enhancedLists, weeklyProgress } };
  const bytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  const t1 = performance.now();

  return {
    elapsedMs: t1 - t0,
    bytes,
    weeklyProgressCount: weeklyProgress.length,
    listCount: board.lists.length,
    cardCount: board.lists.reduce((sum, list) => sum + list.cards.length, 0),
  };
}

async function main() {
  const { boardId: requestedBoardId, iterations } = parseArgs();

  const boardId =
    requestedBoardId ||
    (
      await prisma.board.findFirst({
        where: { archivedAt: null },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      })
    )?.id;

  if (!boardId) {
    console.error('No board found. Provide --boardId <id>.');
    process.exitCode = 1;
    return;
  }

  console.log(`Benchmark board: ${boardId}`);
  console.log(`Iterations: ${iterations}`);

  const lightTimes: number[] = [];
  const fullTimes: number[] = [];
  const lightBytes: number[] = [];
  const fullBytes: number[] = [];

  let meta:
    | {
        listCount: number;
        cardCount: number;
        weeklyProgressCount: number;
      }
    | undefined;

  for (let i = 0; i < iterations; i += 1) {
    const light = await runLight(boardId);
    const full = await runFull(boardId);

    lightTimes.push(light.elapsedMs);
    fullTimes.push(full.elapsedMs);
    lightBytes.push(light.bytes);
    fullBytes.push(full.bytes);

    meta = {
      listCount: full.listCount,
      cardCount: full.cardCount,
      weeklyProgressCount: full.weeklyProgressCount,
    };
  }

  const avgLightMs = average(lightTimes);
  const avgFullMs = average(fullTimes);
  const avgLightBytes = average(lightBytes);
  const avgFullBytes = average(fullBytes);
  const reductionBytes = avgFullBytes - avgLightBytes;
  const reductionPct = avgFullBytes > 0 ? (reductionBytes / avgFullBytes) * 100 : 0;

  console.log('');
  console.log('Results (average):');
  console.log(`- light query+transform: ${formatMs(avgLightMs)}`);
  console.log(`- full  query+transform: ${formatMs(avgFullMs)}`);
  console.log(`- light payload size:   ${formatKB(avgLightBytes)} (${Math.round(avgLightBytes)} bytes)`);
  console.log(`- full  payload size:   ${formatKB(avgFullBytes)} (${Math.round(avgFullBytes)} bytes)`);
  console.log(`- size reduction:       ${formatKB(reductionBytes)} (${reductionPct.toFixed(1)}%)`);
  if (meta) {
    console.log('');
    console.log('Board shape:');
    console.log(`- lists: ${meta.listCount}`);
    console.log(`- cards: ${meta.cardCount}`);
    console.log(`- weekly progress rows: ${meta.weeklyProgressCount}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
