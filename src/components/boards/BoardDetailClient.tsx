'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { BoardViewWrapper } from '@/components/boards/BoardViewWrapper';
import { BoardSkeleton } from '@/components/boards/BoardSkeleton';
import { useBoard } from '@/hooks/api/use-boards';
import type { Board, WeeklyProgress } from '@/types';

interface BoardDetailClientProps {
  boardId: string;
  currentUserId: string;
  userPermission?: string;
  canViewQualitySummaries?: boolean;
}

type BoardApiPayload = Board & { weeklyProgress?: WeeklyProgress[] };

function mapBoardPayload(rawData: Record<string, unknown>): { board: Board; weeklyProgress: WeeklyProgress[] } {
  // Keep payload mapping shallow to avoid cloning large card/list trees on every fetch.
  const payload = rawData as unknown as Partial<BoardApiPayload>;
  const board = {
    ...payload,
    settings: payload.settings ?? {},
    members: payload.members ?? [],
    lists: payload.lists ?? [],
    timelineBlocks: payload.timelineBlocks ?? [],
  } as Board;

  return {
    board,
    weeklyProgress: payload.weeklyProgress ?? [],
  };
}

export function BoardDetailClient({
  boardId,
  currentUserId,
  userPermission,
  canViewQualitySummaries = false,
}: BoardDetailClientProps) {
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

  const board = fullData?.board ?? lightData?.board ?? null;
  const weeklyProgress = fullData?.weeklyProgress ?? lightData?.weeklyProgress ?? [];
  const hasFullData = Boolean(fullData);

  useEffect(() => {
    if (!lightData || hasFullData || isFetchingFullData) return;

    const prefetch = () => {
      if (hasFullData || isFetchingFullData) return;
      void refetchFullBoard();
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleHandle = (
        window as Window & {
          requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
          cancelIdleCallback: (handle: number) => void;
        }
      ).requestIdleCallback(() => prefetch(), { timeout: 1200 });

      return () => {
        (
          window as Window & {
            cancelIdleCallback: (handle: number) => void;
          }
        ).cancelIdleCallback(idleHandle);
      };
    }

    const timeoutHandle = globalThis.setTimeout(() => prefetch(), 400);
    return () => globalThis.clearTimeout(timeoutHandle);
  }, [lightData, hasFullData, isFetchingFullData, refetchFullBoard]);

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
  const isViewer = !isSuperAdmin && currentMember?.permission === 'VIEWER';

  return (
    <BoardViewWrapper
      board={board}
      currentUserId={currentUserId}
      weeklyProgress={weeklyProgress}
      isAdmin={canEdit}
      canEditSpine={!isViewer}
      canViewQualitySummaries={canViewQualitySummaries}
      hasFullData={hasFullData}
      isLoadingFullData={isFetchingFullData}
      onLoadFullData={loadFullData}
    />
  );
}
