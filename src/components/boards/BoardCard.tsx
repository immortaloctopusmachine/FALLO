'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layers, FileText, MoreHorizontal, Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BoardCardProps {
  id: string;
  name: string;
  description: string | null;
  listCount: number;
  memberCount: number;
  isTemplate?: boolean;
  isAdmin?: boolean;
}

export function BoardCard({
  id,
  name,
  description,
  listCount,
  memberCount,
  isTemplate = false,
  isAdmin = false,
}: BoardCardProps) {
  const router = useRouter();
  const [isCloning, setIsCloning] = useState(false);
  const iconBg = isTemplate ? 'bg-warning/10' : 'bg-card-epic/10';
  const iconColor = isTemplate ? 'text-warning' : 'text-card-epic';
  const hoverColor = isTemplate ? 'group-hover:text-warning' : 'group-hover:text-card-epic';

  const handleClone = async (e: React.MouseEvent, asTemplate: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    setIsCloning(true);
    try {
      const response = await fetch(`/api/boards/${id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asTemplate }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        router.push(`/boards/${result.data.id}`);
        router.refresh();
      } else {
        console.error('Failed to clone board:', result.error);
      }
    } catch (error) {
      console.error('Failed to clone board:', error);
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="group relative rounded-lg border border-border bg-surface transition-colors hover:border-border hover:bg-surface-raised">
      <Link href={`/boards/${id}`} className="block p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconBg} ${iconColor}`}>
            {isTemplate ? <FileText className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`truncate text-title font-semibold text-text-primary ${hoverColor}`}>
                {name}
              </h3>
              {isTemplate && (
                <span className="shrink-0 rounded bg-warning/10 px-1.5 py-0.5 text-tiny font-medium text-warning">
                  Template
                </span>
              )}
            </div>
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

      {/* Admin Actions Menu */}
      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.preventDefault()}
              className="absolute right-2 top-2 rounded-md p-1.5 opacity-0 transition-opacity hover:bg-surface-hover group-hover:opacity-100 focus:opacity-100"
              disabled={isCloning}
            >
              <MoreHorizontal className="h-4 w-4 text-text-secondary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => handleClone(e, false)}
              disabled={isCloning}
            >
              <Copy className="mr-2 h-4 w-4" />
              {isCloning ? 'Duplicating...' : 'Duplicate Board'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => handleClone(e, true)}
              disabled={isCloning}
            >
              <FileText className="mr-2 h-4 w-4" />
              {isCloning ? 'Creating...' : 'Save as Template'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
