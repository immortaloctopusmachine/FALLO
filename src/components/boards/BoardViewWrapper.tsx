'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { BoardHeader } from './BoardHeader';
import { BoardView } from './BoardView';
import { BoardSettingsModal } from './BoardSettingsModal';
import { BoardMembersModal } from './BoardMembersModal';
import type { Board, BoardViewMode, BoardSettings, WeeklyProgress } from '@/types';
import { getBoardBackgroundStyle } from '@/lib/board-backgrounds';
import { recordClientPerf } from '@/lib/perf-client';
import { cn } from '@/lib/utils';

const TasksView = dynamic(
  () => import('./views/TasksView').then((module) => module.TasksView)
);
const PlanningView = dynamic(
  () => import('./views/PlanningView').then((module) => module.PlanningView)
);
const SpineTrackerView = dynamic(
  () => import('@/components/spine-tracker').then((module) => module.SpineTrackerView)
);

interface BoardViewWrapperProps {
  board: Board;
  currentUserId?: string;
  weeklyProgress?: WeeklyProgress[];
  isAdmin?: boolean;
  canEditSpine?: boolean;
  canViewQualitySummaries?: boolean;
  hasFullData?: boolean;
  isLoadingFullData?: boolean;
  onLoadFullData?: () => Promise<void>;
}

export function BoardViewWrapper({
  board: initialBoard,
  currentUserId,
  weeklyProgress = [],
  isAdmin = false,
  canEditSpine = true,
  canViewQualitySummaries = false,
  hasFullData = true,
  isLoadingFullData = false,
  onLoadFullData,
}: BoardViewWrapperProps) {
  const [board, setBoard] = useState(initialBoard);
  const [viewMode, setViewMode] = useState<BoardViewMode>('tasks');
  const [hasMountedSpineTracker, setHasMountedSpineTracker] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const pendingViewSwitchRef = useRef<{ mode: BoardViewMode; startMs: number } | null>(null);

  useEffect(() => {
    setBoard(initialBoard);
  }, [initialBoard]);

  // If the board changes, reset the kept-alive Spine view to avoid cross-board state carryover.
  useEffect(() => {
    setHasMountedSpineTracker(false);
  }, [initialBoard.id]);

  useEffect(() => {
    // Prefetch secondary view chunks when the browser is idle, not after a fixed delay.
    const prefetch = () => {
      void import('./views/PlanningView');
      void import('@/components/spine-tracker');
    };

    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(prefetch);
      return () => cancelIdleCallback(id);
    }
    // Fallback for Safari (no requestIdleCallback)
    const timer = window.setTimeout(prefetch, 200);
    return () => window.clearTimeout(timer);
  }, []);

  const prefetchPlanningData = useCallback(() => {
    if (!hasFullData && !isLoadingFullData && onLoadFullData) {
      void onLoadFullData();
    }
  }, [hasFullData, isLoadingFullData, onLoadFullData]);

  const prefetchSpineView = useCallback(() => {
    void import('@/components/spine-tracker');
  }, []);

  const handleViewModeChange = async (mode: BoardViewMode) => {
    pendingViewSwitchRef.current = { mode, startMs: performance.now() };
    setViewMode(mode);

    if (mode === 'planning') {
      prefetchPlanningData();
    }
    if (mode === 'spine') {
      setHasMountedSpineTracker(true);
    }
  };

  useEffect(() => {
    const pendingSwitch = pendingViewSwitchRef.current;
    if (!pendingSwitch || pendingSwitch.mode !== viewMode) return;

    const waitingForPlanningData = viewMode === 'planning' && !hasFullData;
    if (waitingForPlanningData) return;

    const rafHandle = requestAnimationFrame(() => {
      recordClientPerf('board.view_switch', performance.now() - pendingSwitch.startMs, {
        mode: viewMode,
        hasFullData,
      });
    });

    pendingViewSwitchRef.current = null;
    return () => cancelAnimationFrame(rafHandle);
  }, [viewMode, hasFullData]);

  const handleSaveSettings = async (newSettings: BoardSettings) => {
    const response = await fetch(`/api/boards/${board.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: newSettings }),
    });

    if (!response.ok) {
      throw new Error('Failed to save settings');
    }

    // Update local state
    setBoard((prev) => ({
      ...prev,
      settings: newSettings,
    }));
  };

  const bgStyle = getBoardBackgroundStyle(board.settings);

  // Stabilize the members array so BoardHeader doesn't re-render on every board state change.
  const headerMembers = useMemo(
    () => board.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
    })),
    [board.members]
  );

  return (
    <div className={cn("flex h-screen flex-col", !bgStyle && "bg-background")} style={bgStyle}>
      <BoardHeader
        name={board.name}
        settings={board.settings}
        memberCount={board.members.length}
        members={headerMembers}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onPlanningPrefetch={prefetchPlanningData}
        onSpinePrefetch={prefetchSpineView}
        onSettingsClick={() => setSettingsOpen(true)}
        onMembersClick={() => setMembersOpen(true)}
        showSettings={isAdmin}
      />
      <div className="flex-1 overflow-hidden">
        <div
          className={cn('h-full', viewMode === 'spine' ? 'hidden' : 'block')}
          aria-hidden={viewMode === 'spine'}
        >
          {viewMode === 'tasks' ? (
            <TasksView
              board={board}
              currentUserId={currentUserId}
              weeklyProgress={weeklyProgress}
              canViewQualitySummaries={canViewQualitySummaries}
            />
          ) : viewMode === 'planning' ? (
            isLoadingFullData && !hasFullData ? (
              <div className="flex h-full items-center justify-center text-text-tertiary">
                Loading planning data...
              </div>
            ) : (
              <PlanningView
                board={board}
                currentUserId={currentUserId}
                weeklyProgress={weeklyProgress}
                isAdmin={isAdmin}
                canViewQualitySummaries={canViewQualitySummaries}
              />
            )
          ) : viewMode === 'spine' ? null : (
            // Fallback to original BoardView for legacy
            <BoardView board={board} currentUserId={currentUserId} canViewQualitySummaries={canViewQualitySummaries} />
          )}
        </div>

        <div
          className={cn('h-full', viewMode === 'spine' ? 'block' : 'hidden')}
          aria-hidden={viewMode !== 'spine'}
        >
          {(hasMountedSpineTracker || viewMode === 'spine') ? (
            <SpineTrackerView boardId={board.id} canEdit={canEditSpine} />
          ) : null}
        </div>
      </div>

      {/* Settings Modal */}
      <BoardSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        boardId={board.id}
        boardName={board.name}
        isTemplate={board.isTemplate}
        settings={board.settings || {}}
        onSave={handleSaveSettings}
      />

      {/* Members Modal */}
      <BoardMembersModal
        isOpen={membersOpen}
        onClose={() => setMembersOpen(false)}
        boardId={board.id}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
