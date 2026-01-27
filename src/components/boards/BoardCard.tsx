'use client';

import Link from 'next/link';
import { Layers } from 'lucide-react';

interface BoardCardProps {
  id: string;
  name: string;
  description: string | null;
  listCount: number;
  memberCount: number;
}

export function BoardCard({ id, name, description, listCount, memberCount }: BoardCardProps) {
  return (
    <Link
      href={`/boards/${id}`}
      className="group block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border hover:bg-surface-raised"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-card-epic/10 text-card-epic">
          <Layers className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-title font-semibold text-text-primary group-hover:text-card-epic">
            {name}
          </h3>
          {description && (
            <p className="mt-1 line-clamp-2 text-caption text-text-secondary">
              {description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-caption text-text-tertiary">
            <span>{listCount} lists</span>
            <span>{memberCount} members</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
