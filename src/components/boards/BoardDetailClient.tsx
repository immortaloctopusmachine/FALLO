'use client';

import { BoardViewWrapper } from '@/components/boards/BoardViewWrapper';
import { BoardSkeleton } from '@/components/boards/BoardSkeleton';
import { useBoard } from '@/hooks/api/use-boards';
import type { Board, Card, List, WeeklyProgress } from '@/types';

interface BoardDetailClientProps {
  boardId: string;
  currentUserId: string;
}

export function BoardDetailClient({ boardId, currentUserId }: BoardDetailClientProps) {
  const { data: rawData, isLoading } = useBoard(boardId);

  if (isLoading || !rawData) return <BoardSkeleton />;

  // The API returns JSON-serialized Prisma data with computed stats.
  // Dates are already ISO strings from JSON serialization.
  // We need to cast it to the Board type that BoardViewWrapper expects.
  const data = rawData as Record<string, unknown>;

  const board: Board = {
    id: data.id as string,
    name: data.name as string,
    description: data.description as string | null,
    isTemplate: data.isTemplate as boolean,
    settings: (data.settings || {}) as Board['settings'],
    createdAt: data.createdAt as string,
    updatedAt: data.updatedAt as string,
    archivedAt: (data.archivedAt as string) || null,
    members: (data.members as Record<string, unknown>[]).map((m) => ({
      id: m.id as string,
      userId: m.userId as string,
      user: {
        id: (m.user as Record<string, unknown>).id as string,
        email: (m.user as Record<string, unknown>).email as string,
        name: (m.user as Record<string, unknown>).name as string | null,
        image: (m.user as Record<string, unknown>).image as string | null,
        permission: (m.user as Record<string, unknown>).permission as Board['members'][0]['user']['permission'],
      },
      permission: m.permission as Board['members'][0]['permission'],
      joinedAt: m.joinedAt as string,
    })),
    lists: (data.lists as Record<string, unknown>[]).map((list) => ({
      id: list.id as string,
      name: list.name as string,
      position: list.position as number,
      boardId: list.boardId as string,
      createdAt: list.createdAt as string,
      updatedAt: list.updatedAt as string,
      viewType: list.viewType as List['viewType'],
      phase: (list.phase as List['phase']) || null,
      color: (list.color as string) || null,
      startDate: (list.startDate as string) || null,
      endDate: (list.endDate as string) || null,
      durationWeeks: (list.durationWeeks as number) || null,
      durationDays: (list.durationDays as number) || null,
      timelineBlockId: (list.timelineBlockId as string) || null,
      timelineBlock: list.timelineBlock as List['timelineBlock'] || null,
      cards: (list.cards as unknown[]) as Card[],
    })) as List[],
  };

  // Transform weekly progress
  const weeklyProgress: WeeklyProgress[] = ((data.weeklyProgress as Record<string, unknown>[]) || []).map((wp) => ({
    id: wp.id as string,
    weekStartDate: wp.weekStartDate as string,
    totalStoryPoints: wp.totalStoryPoints as number,
    completedPoints: wp.completedPoints as number,
    tasksCompleted: wp.tasksCompleted as number,
    tasksTotal: wp.tasksTotal as number,
    createdAt: wp.createdAt as string,
  }));

  // Check if current user is admin
  const currentMember = board.members.find((m) => m.userId === currentUserId);
  const isAdmin = currentMember?.permission === 'ADMIN' || currentMember?.permission === 'SUPER_ADMIN';

  return (
    <BoardViewWrapper
      board={board}
      currentUserId={currentUserId}
      weeklyProgress={weeklyProgress}
      isAdmin={isAdmin}
    />
  );
}
