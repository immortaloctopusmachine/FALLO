'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Archive, Loader2 } from 'lucide-react';
import { BoardCard } from './BoardCard';
import { useArchivedBoards } from '@/hooks/api/use-boards';

interface ArchivedBoardsSectionProps {
  currentUserId: string;
  isSuperAdmin?: boolean;
}

export function ArchivedBoardsSection({ currentUserId, isSuperAdmin = false }: ArchivedBoardsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: archivedBoardsRaw, isLoading, refetch } = useArchivedBoards({ enabled: isExpanded });

  const isAdminForBoard = (board: { members: { userId: string; permission: string }[] }) => {
    const membership = board.members.find(m => m.userId === currentUserId);
    return membership?.permission === 'ADMIN' || membership?.permission === 'SUPER_ADMIN';
  };

  const boards = (archivedBoardsRaw || []).map(board => ({
    id: board.id,
    name: board.name,
    description: board.description,
    listCount: board.lists.length,
    memberCount: board.members.length,
    members: board.members.map(m => ({ id: m.user.id, name: m.user.name, image: m.user.image })),
    isTemplate: board.isTemplate,
    isAdmin: isAdminForBoard(board),
    settings: board.settings,
  }));

  return (
    <div className="mt-10">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-6 flex items-center gap-2 text-text-tertiary hover:text-text-secondary transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Archive className="h-4 w-4" />
        <h2 className="text-title font-medium">
          Archived{boards.length > 0 ? ` (${boards.length})` : ''}
        </h2>
      </button>

      {isExpanded && (
        <>
          {isLoading ? (
            <div className="flex items-center gap-2 ml-6 text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-body">Loading archived boards...</span>
            </div>
          ) : boards.length === 0 ? (
            <p className="text-caption text-text-tertiary ml-6">
              No archived boards.
            </p>
          ) : (
            <>
              <p className="text-caption text-text-tertiary mb-4 ml-6">
                Archived boards are hidden from the main view but their timeline projects remain visible.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 opacity-75">
                {boards.map((board) => (
                  <BoardCard
                    key={board.id}
                    id={board.id}
                    name={board.name}
                    description={board.description}
                    listCount={board.listCount}
                    memberCount={board.memberCount}
                    members={board.members}
                    isTemplate={board.isTemplate}
                    isAdmin={board.isAdmin}
                    isSuperAdmin={isSuperAdmin}
                    isArchived={true}
                    settings={board.settings}
                    onDeleted={() => refetch()}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
