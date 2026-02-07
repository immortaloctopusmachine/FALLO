import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    card: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
      updateMany: vi.fn(),
    },
    list: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { processDueStagedTasks } from '../task-release';

const mockedPrisma = prisma as unknown as {
  card: {
    findMany: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  list: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('task-release', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('releases due staged tasks to the target list with next position', async () => {
    const now = new Date('2026-02-07T12:00:00.000Z');

    mockedPrisma.card.findMany.mockResolvedValue([
      {
        id: 'task-1',
        listId: 'planning-list-1',
        taskData: {
          releaseMode: 'STAGED',
          scheduledReleaseDate: '2026-02-06T00:00:00.000Z',
          releaseTargetListId: 'tasks-backlog-1',
          releasedAt: null,
        },
        list: {
          boardId: 'board-1',
        },
      },
    ]);

    mockedPrisma.list.findMany.mockResolvedValue([
      { id: 'tasks-backlog-1', boardId: 'board-1' },
    ]);

    mockedPrisma.card.groupBy.mockResolvedValue([
      { listId: 'tasks-backlog-1', _max: { position: 3 } },
    ]);

    mockedPrisma.card.updateMany.mockResolvedValue({ count: 1 });

    const result = await processDueStagedTasks({ now });

    expect(result).toEqual({
      scanned: 1,
      due: 1,
      released: 1,
      skippedNoSchedule: 0,
      skippedInvalidSchedule: 0,
      skippedMissingTarget: 0,
      skippedIdempotent: 0,
    });

    expect(mockedPrisma.card.updateMany).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.card.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'task-1',
        archivedAt: null,
        taskData: {
          path: ['releaseMode'],
          equals: 'STAGED',
        },
      },
      data: {
        listId: 'tasks-backlog-1',
        position: 4,
        taskData: expect.objectContaining({
          releaseMode: 'IMMEDIATE',
          releaseTargetListId: 'tasks-backlog-1',
          releasedAt: now.toISOString(),
        }),
      },
    });
  });

  it('skips tasks without valid due schedule', async () => {
    const now = new Date('2026-02-07T12:00:00.000Z');

    mockedPrisma.card.findMany.mockResolvedValue([
      {
        id: 'task-no-schedule',
        listId: 'planning-list-1',
        taskData: {
          releaseMode: 'STAGED',
          releaseTargetListId: 'tasks-backlog-1',
        },
        list: { boardId: 'board-1' },
      },
      {
        id: 'task-invalid-schedule',
        listId: 'planning-list-1',
        taskData: {
          releaseMode: 'STAGED',
          scheduledReleaseDate: 'invalid-date',
          releaseTargetListId: 'tasks-backlog-1',
        },
        list: { boardId: 'board-1' },
      },
      {
        id: 'task-future-schedule',
        listId: 'planning-list-1',
        taskData: {
          releaseMode: 'STAGED',
          scheduledReleaseDate: '2026-02-10T00:00:00.000Z',
          releaseTargetListId: 'tasks-backlog-1',
        },
        list: { boardId: 'board-1' },
      },
      {
        id: 'task-already-released',
        listId: 'planning-list-1',
        taskData: {
          releaseMode: 'STAGED',
          scheduledReleaseDate: '2026-02-06T00:00:00.000Z',
          releaseTargetListId: 'tasks-backlog-1',
          releasedAt: '2026-02-06T10:00:00.000Z',
        },
        list: { boardId: 'board-1' },
      },
    ]);

    const result = await processDueStagedTasks({ now });

    expect(result).toEqual({
      scanned: 4,
      due: 0,
      released: 0,
      skippedNoSchedule: 1,
      skippedInvalidSchedule: 1,
      skippedMissingTarget: 0,
      skippedIdempotent: 0,
    });

    expect(mockedPrisma.list.findMany).not.toHaveBeenCalled();
    expect(mockedPrisma.card.groupBy).not.toHaveBeenCalled();
    expect(mockedPrisma.card.updateMany).not.toHaveBeenCalled();
  });

  it('skips due tasks when target list is missing or invalid', async () => {
    const now = new Date('2026-02-07T12:00:00.000Z');

    mockedPrisma.card.findMany.mockResolvedValue([
      {
        id: 'task-missing-target',
        listId: 'planning-list-1',
        taskData: {
          releaseMode: 'STAGED',
          scheduledReleaseDate: '2026-02-06T00:00:00.000Z',
          releaseTargetListId: null,
        },
        list: { boardId: 'board-1' },
      },
      {
        id: 'task-invalid-target',
        listId: 'planning-list-1',
        taskData: {
          releaseMode: 'STAGED',
          scheduledReleaseDate: '2026-02-06T00:00:00.000Z',
          releaseTargetListId: 'tasks-backlog-2',
        },
        list: { boardId: 'board-1' },
      },
    ]);

    mockedPrisma.list.findMany.mockResolvedValue([]);
    mockedPrisma.card.groupBy.mockResolvedValue([]);

    const result = await processDueStagedTasks({ now });

    expect(result).toEqual({
      scanned: 2,
      due: 2,
      released: 0,
      skippedNoSchedule: 0,
      skippedInvalidSchedule: 0,
      skippedMissingTarget: 2,
      skippedIdempotent: 0,
    });

    expect(mockedPrisma.card.updateMany).not.toHaveBeenCalled();
  });

  it('tracks idempotent skip when update guard prevents duplicate release', async () => {
    const now = new Date('2026-02-07T12:00:00.000Z');

    mockedPrisma.card.findMany.mockResolvedValue([
      {
        id: 'task-1',
        listId: 'planning-list-1',
        taskData: {
          releaseMode: 'STAGED',
          scheduledReleaseDate: '2026-02-06T00:00:00.000Z',
          releaseTargetListId: 'tasks-backlog-1',
        },
        list: { boardId: 'board-1' },
      },
    ]);

    mockedPrisma.list.findMany.mockResolvedValue([
      { id: 'tasks-backlog-1', boardId: 'board-1' },
    ]);
    mockedPrisma.card.groupBy.mockResolvedValue([]);
    mockedPrisma.card.updateMany.mockResolvedValue({ count: 0 });

    const result = await processDueStagedTasks({ now });

    expect(result).toEqual({
      scanned: 1,
      due: 1,
      released: 0,
      skippedNoSchedule: 0,
      skippedInvalidSchedule: 0,
      skippedMissingTarget: 0,
      skippedIdempotent: 1,
    });
  });
});
