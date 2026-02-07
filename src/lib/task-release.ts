import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

interface ReleaseTaskData {
  releaseMode?: 'IMMEDIATE' | 'STAGED';
  scheduledReleaseDate?: string | null;
  releaseTargetListId?: string | null;
  releasedAt?: string | null;
  [key: string]: unknown;
}

export interface ProcessDueStagedTasksOptions {
  boardId?: string;
  now?: Date;
}

export interface ProcessDueStagedTasksResult {
  scanned: number;
  due: number;
  released: number;
  skippedNoSchedule: number;
  skippedInvalidSchedule: number;
  skippedMissingTarget: number;
  skippedIdempotent: number;
}

function isDue(scheduledReleaseDate: string, now: Date): boolean {
  const scheduled = new Date(scheduledReleaseDate);
  if (Number.isNaN(scheduled.getTime())) return false;
  return scheduled.getTime() <= now.getTime();
}

export async function processDueStagedTasks(
  options: ProcessDueStagedTasksOptions = {}
): Promise<ProcessDueStagedTasksResult> {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();

  const stagedTasks = await prisma.card.findMany({
    where: {
      type: 'TASK',
      archivedAt: null,
      ...(options.boardId && {
        list: { boardId: options.boardId },
      }),
      taskData: {
        path: ['releaseMode'],
        equals: 'STAGED',
      },
    },
    select: {
      id: true,
      listId: true,
      taskData: true,
      list: {
        select: {
          boardId: true,
        },
      },
    },
  });

  let skippedNoSchedule = 0;
  let skippedInvalidSchedule = 0;
  const dueTasks = stagedTasks.filter((task) => {
    const taskData = (task.taskData || {}) as ReleaseTaskData;
    if (taskData.releasedAt) return false;

    const scheduledReleaseDate = taskData.scheduledReleaseDate;
    if (!scheduledReleaseDate) {
      skippedNoSchedule += 1;
      return false;
    }

    if (!isDue(scheduledReleaseDate, now)) {
      const parsed = new Date(scheduledReleaseDate);
      if (Number.isNaN(parsed.getTime())) {
        skippedInvalidSchedule += 1;
      }
      return false;
    }

    return true;
  });

  const dueTargetIds = Array.from(new Set(
    dueTasks
      .map((task) => ((task.taskData || {}) as ReleaseTaskData).releaseTargetListId)
      .filter((id): id is string => !!id)
  ));

  const targetLists = dueTargetIds.length > 0
    ? await prisma.list.findMany({
      where: { id: { in: dueTargetIds } },
      select: { id: true, boardId: true },
    })
    : [];

  const targetListById = new Map(targetLists.map((list) => [list.id, list]));

  const maxPositionsByListRows = dueTargetIds.length > 0
    ? await prisma.card.groupBy({
      by: ['listId'],
      where: {
        archivedAt: null,
        listId: { in: dueTargetIds },
      },
      _max: { position: true },
    })
    : [];

  const nextPositionByList = new Map<string, number>(
    dueTargetIds.map((listId) => [listId, 0])
  );

  maxPositionsByListRows.forEach((row) => {
    nextPositionByList.set(row.listId, (row._max.position ?? -1) + 1);
  });

  let released = 0;
  let skippedMissingTarget = 0;
  let skippedIdempotent = 0;

  for (const task of dueTasks) {
    const taskData = (task.taskData || {}) as ReleaseTaskData;
    const releaseTargetListId = taskData.releaseTargetListId;

    if (!releaseTargetListId) {
      skippedMissingTarget += 1;
      continue;
    }

    const releaseTargetList = targetListById.get(releaseTargetListId);
    if (!releaseTargetList || releaseTargetList.boardId !== task.list.boardId) {
      skippedMissingTarget += 1;
      continue;
    }

    const nextPosition = nextPositionByList.get(releaseTargetListId) ?? 0;
    nextPositionByList.set(releaseTargetListId, nextPosition + 1);

    const updatedTaskData: ReleaseTaskData = {
      ...taskData,
      releaseMode: 'IMMEDIATE',
      releasedAt: nowIso,
      releaseTargetListId,
    };

    const updateResult = await prisma.card.updateMany({
      where: {
        id: task.id,
        archivedAt: null,
        taskData: {
          path: ['releaseMode'],
          equals: 'STAGED',
        },
      },
      data: {
        listId: releaseTargetListId,
        position: nextPosition,
        taskData: updatedTaskData as Prisma.InputJsonValue,
      },
    });

    if (updateResult.count === 1) {
      released += 1;
    } else {
      skippedIdempotent += 1;
    }
  }

  return {
    scanned: stagedTasks.length,
    due: dueTasks.length,
    released,
    skippedNoSchedule,
    skippedInvalidSchedule,
    skippedMissingTarget,
    skippedIdempotent,
  };
}
