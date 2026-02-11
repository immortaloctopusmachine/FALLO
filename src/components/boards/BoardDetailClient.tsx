'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BoardViewWrapper } from '@/components/boards/BoardViewWrapper';
import { BoardSkeleton } from '@/components/boards/BoardSkeleton';
import { useBoard } from '@/hooks/api/use-boards';
import type { Board, Card, List, WeeklyProgress } from '@/types';

interface BoardDetailClientProps {
  boardId: string;
  currentUserId: string;
  userPermission?: string;
}

function mapBoardPayload(rawData: Record<string, unknown>): { board: Board; weeklyProgress: WeeklyProgress[] } {
  const board: Board = {
    id: rawData.id as string,
    name: rawData.name as string,
    description: rawData.description as string | null,
    isTemplate: rawData.isTemplate as boolean,
    settings: (rawData.settings || {}) as Board['settings'],
    createdAt: rawData.createdAt as string,
    updatedAt: rawData.updatedAt as string,
    archivedAt: (rawData.archivedAt as string) || null,
    members: (rawData.members as Record<string, unknown>[]).map((m) => ({
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
    lists: (rawData.lists as Record<string, unknown>[]).map((list) => ({
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

  const weeklyProgress: WeeklyProgress[] = ((rawData.weeklyProgress as Record<string, unknown>[]) || []).map((wp) => ({
    id: wp.id as string,
    weekStartDate: wp.weekStartDate as string,
    totalStoryPoints: wp.totalStoryPoints as number,
    completedPoints: wp.completedPoints as number,
    tasksCompleted: wp.tasksCompleted as number,
    tasksTotal: wp.tasksTotal as number,
    createdAt: wp.createdAt as string,
  }));

  return { board, weeklyProgress };
}

export function BoardDetailClient({ boardId, currentUserId, userPermission }: BoardDetailClientProps) {
  const { data: rawLightData, isLoading } = useBoard(boardId, 'light');
  const {
    data: rawFullData,
    isFetching: isFetchingFullData,
    refetch: refetchFullBoard,
  } = useBoard(boardId, 'full', false);

  const lightData = useMemo(
    () => (rawLightData ? mapBoardPayload(rawLightData as Record<string, unknown>) : null),
    [rawLightData]
  );
  const fullData = useMemo(
    () => (rawFullData ? mapBoardPayload(rawFullData as Record<string, unknown>) : null),
    [rawFullData]
  );

  const [board, setBoard] = useState<Board | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);
  const [hasFullData, setHasFullData] = useState(false);

  useEffect(() => {
    if (!lightData) return;
    setBoard(lightData.board);
    setWeeklyProgress(lightData.weeklyProgress);
    setHasFullData(false);
  }, [lightData]);

  useEffect(() => {
    if (!fullData) return;
    setBoard(fullData.board);
    setWeeklyProgress(fullData.weeklyProgress);
    setHasFullData(true);
  }, [fullData]);

  const loadFullData = useCallback(async () => {
    if (hasFullData || isFetchingFullData) return;
    await refetchFullBoard();
  }, [hasFullData, isFetchingFullData, refetchFullBoard]);

  if (isLoading || !board) return <BoardSkeleton />;

  // Check if current user can edit this board:
  // - SUPER_ADMIN can edit any board
  // - Board ADMIN members can edit their boards
  const isSuperAdmin = userPermission === 'SUPER_ADMIN';
  const currentMember = board.members.find((m) => m.userId === currentUserId);
  const isBoardAdmin = currentMember?.permission === 'ADMIN' || currentMember?.permission === 'SUPER_ADMIN';
  const canEdit = isSuperAdmin || isBoardAdmin;

  return (
    <BoardViewWrapper
      board={board}
      currentUserId={currentUserId}
      weeklyProgress={weeklyProgress}
      isAdmin={canEdit}
      hasFullData={hasFullData}
      isLoadingFullData={isFetchingFullData}
      onLoadFullData={loadFullData}
    />
  );
}
