'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BoardHeader } from './BoardHeader';
import { BoardView } from './BoardView';
import { BoardSettingsModal } from './BoardSettingsModal';
import { BoardMembersModal } from './BoardMembersModal';
import type { Board, BoardViewMode, BoardSettings, WeeklyProgress } from '@/types';
import { getBoardBackgroundStyle } from '@/lib/board-backgrounds';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  useEffect(() => {
    setBoard(initialBoard);
  }, [initialBoard]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void import('./views/PlanningView');
      void import('@/components/spine-tracker');
    }, 300);

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
    setViewMode(mode);

    if (mode === 'planning') {
      prefetchPlanningData();
    }
  };

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

  return (
    <div className={cn("flex h-screen flex-col", !bgStyle && "bg-background")} style={bgStyle}>
      <BoardHeader
        name={board.name}
        settings={board.settings}
        memberCount={board.members.length}
        members={board.members.map((member) => ({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          image: member.user.image,
        }))}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onPlanningPrefetch={prefetchPlanningData}
        onSpinePrefetch={prefetchSpineView}
        onSettingsClick={() => setSettingsOpen(true)}
        onMembersClick={() => setMembersOpen(true)}
        showSettings={isAdmin}
      />
      <div className="flex-1 overflow-hidden">
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
        ) : viewMode === 'spine' ? (
          <SpineTrackerView boardId={board.id} canEdit={canEditSpine} />
        ) : (
          // Fallback to original BoardView for legacy
          <BoardView board={board} currentUserId={currentUserId} canViewQualitySummaries={canViewQualitySummaries} />
        )}
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
