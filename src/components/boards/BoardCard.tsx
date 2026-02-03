'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layers, FileText, MoreHorizontal, Copy, Archive, ArchiveRestore } from 'lucide-react';
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
  isArchived?: boolean;
}

export function BoardCard({
  id,
  name,
  description,
  listCount,
  memberCount,
  isTemplate = false,
  isAdmin = false,
  isArchived = false,
}: BoardCardProps) {
  const router = useRouter();
  const [isCloning, setIsCloning] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const iconBg = isArchived ? 'bg-text-tertiary/10' : isTemplate ? 'bg-warning/10' : 'bg-card-epic/10';
  const iconColor = isArchived ? 'text-text-tertiary' : isTemplate ? 'text-warning' : 'text-card-epic';
  const hoverColor = isArchived ? 'group-hover:text-text-secondary' : isTemplate ? 'group-hover:text-warning' : 'group-hover:text-card-epic';

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

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Archive board "${name}"? The board will be hidden but the timeline project will remain.`)) {
      return;
    }

    setIsArchiving(true);
    try {
      const response = await fetch(`/api/boards/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      } else {
        const result = await response.json();
        console.error('Failed to archive board:', result.error);
      }
    } catch (error) {
      console.error('Failed to archive board:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsArchiving(true);
    try {
      const response = await fetch(`/api/boards/${id}/unarchive`, {
        method: 'POST',
      });

      if (response.ok) {
        router.refresh();
      } else {
        const result = await response.json();
        console.error('Failed to unarchive board:', result.error);
      }
    } catch (error) {
      console.error('Failed to unarchive board:', error);
    } finally {
      setIsArchiving(false);
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
              <h3 className={`truncate text-title font-semibold ${isArchived ? 'text-text-tertiary' : 'text-text-primary'} ${hoverColor}`}>
                {name}
              </h3>
              {isArchived && (
                <span className="shrink-0 rounded bg-text-tertiary/10 px-1.5 py-0.5 text-tiny font-medium text-text-tertiary">
                  Archived
                </span>
              )}
              {isTemplate && !isArchived && (
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
              disabled={isCloning || isArchiving}
            >
              <MoreHorizontal className="h-4 w-4 text-text-secondary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {isArchived ? (
              <DropdownMenuItem
                onClick={handleUnarchive}
                disabled={isArchiving}
              >
                <ArchiveRestore className="mr-2 h-4 w-4" />
                {isArchiving ? 'Restoring...' : 'Restore Board'}
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={(e) => handleClone(e, false)}
                  disabled={isCloning}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {isCloning ? 'Duplicating...' : 'Duplicate Board'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => handleClone(e, true)}
                  disabled={isCloning}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {isCloning ? 'Creating...' : 'Save as Template'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="text-warning focus:text-warning"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  {isArchiving ? 'Archiving...' : 'Archive Board'}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
