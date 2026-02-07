'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { BoardCard } from '@/components/boards/BoardCard';
import { ArchivedBoardsSection } from '@/components/boards/ArchivedBoardsSection';
import { BoardsSkeleton } from '@/components/boards/BoardsSkeleton';
import { useBoards, useArchivedBoards } from '@/hooks/api/use-boards';

interface BoardsPageClientProps {
  isAdmin: boolean;
  currentUserId: string;
}

export function BoardsPageClient({ isAdmin, currentUserId }: BoardsPageClientProps) {
  const { data: boards, isLoading } = useBoards();
  const { data: archivedBoardsRaw } = useArchivedBoards();

  if (isLoading) return <BoardsSkeleton />;

  const activeBoards = boards || [];

  // Helper to check if user is admin for a board
  const isAdminForBoard = (board: typeof activeBoards[0]) => {
    const membership = board.members.find(m => m.userId === currentUserId);
    return membership?.permission === 'ADMIN' || membership?.permission === 'SUPER_ADMIN';
  };

  // Separate regular boards from templates
  const regularBoards = activeBoards.filter(b => !b.isTemplate);
  const templateBoards = activeBoards.filter(b => b.isTemplate);

  // Prepare archived boards data
  const archivedBoardsData = (archivedBoardsRaw || []).map(board => ({
    id: board.id,
    name: board.name,
    description: board.description,
    listCount: board.lists.length,
    memberCount: board.members.length,
    isTemplate: board.isTemplate,
    isAdmin: isAdminForBoard(board),
  }));

  return (
    <main className="p-6 flex-1">
      {/* Regular Boards Section */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-title font-medium text-text-secondary">
          Your Boards ({regularBoards.length})
        </h2>
        {isAdmin && (
          <Link
            href="/timeline?create=true"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-body font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </Link>
        )}
      </div>

      {regularBoards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h3 className="text-title text-text-secondary">No boards yet</h3>
          <p className="mt-2 text-body text-text-tertiary">
            Create your first board to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {regularBoards.map((board) => (
            <BoardCard
              key={board.id}
              id={board.id}
              name={board.name}
              description={board.description}
              listCount={board.lists.length}
              memberCount={board.members.length}
              isTemplate={board.isTemplate}
              isAdmin={isAdminForBoard(board)}
            />
          ))}
        </div>
      )}

      {/* Templates Section */}
      {templateBoards.length > 0 && (
        <div className="mt-10">
          <div className="mb-6">
            <h2 className="text-title font-medium text-text-secondary">
              Templates ({templateBoards.length})
            </h2>
            <p className="text-caption text-text-tertiary mt-1">
              Templates can be used to create new boards with predefined cards and structure.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templateBoards.map((board) => (
              <BoardCard
                key={board.id}
                id={board.id}
                name={board.name}
                description={board.description}
                listCount={board.lists.length}
                memberCount={board.members.length}
                isTemplate={board.isTemplate}
                isAdmin={isAdminForBoard(board)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Archived Boards Section */}
      {archivedBoardsData.length > 0 && (
        <ArchivedBoardsSection boards={archivedBoardsData} />
      )}
    </main>
  );
}
