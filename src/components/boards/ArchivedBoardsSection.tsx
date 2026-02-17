'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Archive } from 'lucide-react';
import { BoardCard } from './BoardCard';
import type { BoardSettings } from '@/types';

interface ArchivedBoard {
  id: string;
  name: string;
  description: string | null;
  listCount: number;
  memberCount: number;
  members: { id: string; name: string | null; image: string | null }[];
  isTemplate: boolean;
  isAdmin: boolean;
  settings?: BoardSettings;
}

interface ArchivedBoardsSectionProps {
  boards: ArchivedBoard[];
  isSuperAdmin?: boolean;
  onBoardDeleted?: () => void;
}

export function ArchivedBoardsSection({ boards, isSuperAdmin = false, onBoardDeleted }: ArchivedBoardsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
          Archived ({boards.length})
        </h2>
      </button>

      {isExpanded && (
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
                onDeleted={onBoardDeleted}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
