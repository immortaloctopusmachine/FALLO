'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BoardHeader } from './BoardHeader';
import { BoardView } from './BoardView';
import { BoardSettingsModal } from './BoardSettingsModal';
import { BoardMembersModal } from './BoardMembersModal';
import { TasksView, PlanningView } from './views';
import type { Board, BoardViewMode, BoardSettings, WeeklyProgress } from '@/types';

interface BoardViewWrapperProps {
  board: Board;
  currentUserId?: string;
  weeklyProgress?: WeeklyProgress[];
  isAdmin?: boolean;
}

export function BoardViewWrapper({
  board: initialBoard,
  currentUserId,
  weeklyProgress = [],
  isAdmin = false,
}: BoardViewWrapperProps) {
  const router = useRouter();
  const [board, setBoard] = useState(initialBoard);
  const [viewMode, setViewMode] = useState<BoardViewMode>('tasks');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const handleViewModeChange = (mode: BoardViewMode) => {
    setViewMode(mode);
  };

  // Callback to update board state from child views
  const handleBoardUpdate = useCallback((updatedBoard: Board) => {
    setBoard(updatedBoard);
  }, []);

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

    // Refresh to pick up any computed changes
    router.refresh();
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <BoardHeader
        name={board.name}
        memberCount={board.members.length}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onSettingsClick={() => setSettingsOpen(true)}
        onMembersClick={() => setMembersOpen(true)}
      />
      <div className="flex-1 overflow-hidden">
        {viewMode === 'tasks' ? (
          <TasksView
            board={board}
            currentUserId={currentUserId}
            weeklyProgress={weeklyProgress}
            onBoardUpdate={handleBoardUpdate}
          />
        ) : viewMode === 'planning' ? (
          <PlanningView
            board={board}
            currentUserId={currentUserId}
            weeklyProgress={weeklyProgress}
            isAdmin={isAdmin}
            onBoardUpdate={handleBoardUpdate}
          />
        ) : (
          // Fallback to original BoardView for legacy
          <BoardView board={board} currentUserId={currentUserId} />
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
