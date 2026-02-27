'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { BoardCard } from '@/components/boards/BoardCard';
import { ArchivedBoardsSection } from '@/components/boards/ArchivedBoardsSection';
import { BoardsSkeleton } from '@/components/boards/BoardsSkeleton';
import { CreateBoardDialog } from '@/components/boards/CreateBoardDialog';
import { CreateTemplateBoardDialog } from '@/components/boards/CreateTemplateBoardDialog';
import { useBoards } from '@/hooks/api/use-boards';

interface BoardsPageClientProps {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  currentUserId: string;
}

export function BoardsPageClient({ isAdmin, isSuperAdmin = false, currentUserId }: BoardsPageClientProps) {
  const { data: boards, isLoading } = useBoards();
  const [templatesExpanded, setTemplatesExpanded] = useState(true);

  if (isLoading) return <BoardsSkeleton />;

  const activeBoards = boards || [];
  const canManageTemplates = isAdmin || isSuperAdmin;

  // Helper to check if user is admin for a board
  const isAdminForBoard = (board: { members: { userId: string; permission: string }[] }) => {
    const membership = board.members.find(m => m.userId === currentUserId);
    return membership?.permission === 'ADMIN' || membership?.permission === 'SUPER_ADMIN';
  };

  // Separate regular boards from templates
  const regularBoards = activeBoards.filter(b => !b.isTemplate);
  const templateBoards = activeBoards.filter(b => b.isTemplate);

  return (
    <main className="p-6 flex-1">
      {/* Regular Boards Section */}
      <div className="mb-6 flex items-center justify-between skin-backplate">
        <h2 className="text-title font-medium text-text-secondary">
          Your Boards ({regularBoards.length})
        </h2>
        <CreateBoardDialog />
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
              members={board.members.map(m => ({ id: m.user.id, name: m.user.name, image: m.user.image }))}
              isTemplate={board.isTemplate}
              isAdmin={isAdminForBoard(board)}
              settings={board.settings}
            />
          ))}
        </div>
      )}

      {/* Templates Section - Only visible to admins */}
      {canManageTemplates && (
        <div className="mt-10">
          <div className="mb-6">
            <button
              onClick={() => setTemplatesExpanded(!templatesExpanded)}
              className="flex items-center gap-2 text-title font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              {templatesExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
              Templates ({templateBoards.length})
            </button>
            {templatesExpanded && (
              <div className="flex items-start justify-between gap-4 mt-2">
                <p className="text-caption text-text-tertiary">
                  Templates can be used to create new boards with predefined cards and structure.
                </p>
                <CreateTemplateBoardDialog />
              </div>
            )}
          </div>
          {templatesExpanded && templateBoards.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templateBoards.map((board) => (
                <BoardCard
                  key={board.id}
                  id={board.id}
                  name={board.name}
                  description={board.description}
                  listCount={board.lists.length}
                  memberCount={board.members.length}
                  members={board.members.map(m => ({ id: m.user.id, name: m.user.name, image: m.user.image }))}
                  isTemplate={board.isTemplate}
                  isAdmin={isAdminForBoard(board)}
                  settings={board.settings}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Archived Boards Section - data fetched lazily on expand */}
      <ArchivedBoardsSection
        currentUserId={currentUserId}
        isSuperAdmin={isSuperAdmin}
      />
    </main>
  );
}
