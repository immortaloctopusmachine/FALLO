import { prisma } from '@/lib/prisma';
import { getMonday } from '@/lib/date-utils';

/**
 * Ensure a WeeklyProgress snapshot exists for the current week for a given board.
 * Idempotent: if a row for this week's Monday already exists, it is returned as-is.
 * Otherwise, story points and task counts are calculated from the board's TASK cards
 * and a new row is upserted.
 */
export async function ensureWeeklySnapshot(boardId: string): Promise<void> {
  const weekStart = getMonday(new Date());
  // Normalise to midnight UTC so the unique constraint matches reliably.
  weekStart.setUTCHours(0, 0, 0, 0);

  // Fast path: row already exists for this week.
  const existing = await prisma.weeklyProgress.findUnique({
    where: { boardId_weekStartDate: { boardId, weekStartDate: weekStart } },
    select: { id: true },
  });
  if (existing) return;

  // Fetch board lists + TASK cards in a single query.
  const lists = await prisma.list.findMany({
    where: { boardId },
    select: {
      id: true,
      phase: true,
      viewType: true,
      cards: {
        where: { archivedAt: null, type: 'TASK' },
        select: {
          id: true,
          listId: true,
          taskData: true,
          checklists: {
            select: {
              items: { select: { isComplete: true } },
            },
          },
        },
      },
    },
  });

  const doneListId =
    lists.find((l) => l.viewType === 'TASKS' && l.phase === 'DONE')?.id ?? null;

  const tasks = lists.flatMap((l) => l.cards);
  const tasksTotal = tasks.length;

  let totalStoryPoints = 0;
  let completedPoints = 0;
  let tasksCompleted = 0;

  for (const task of tasks) {
    const td = task.taskData as { storyPoints?: number } | null;
    const sp = td?.storyPoints ?? 0;
    totalStoryPoints += sp;

    const done = isTaskComplete(task, doneListId);
    if (done) {
      tasksCompleted += 1;
      completedPoints += sp;
    }
  }

  await prisma.weeklyProgress.upsert({
    where: { boardId_weekStartDate: { boardId, weekStartDate: weekStart } },
    create: {
      boardId,
      weekStartDate: weekStart,
      totalStoryPoints,
      completedPoints,
      tasksCompleted,
      tasksTotal,
    },
    update: {
      totalStoryPoints,
      completedPoints,
      tasksCompleted,
      tasksTotal,
    },
  });
}

function isTaskComplete(
  task: {
    listId: string;
    checklists: { items: { isComplete: boolean }[] }[];
  },
  doneListId: string | null,
): boolean {
  if (doneListId && task.listId === doneListId) return true;
  const items = task.checklists?.flatMap((cl) => cl.items) ?? [];
  return items.length > 0 && items.every((item) => item.isComplete);
}
