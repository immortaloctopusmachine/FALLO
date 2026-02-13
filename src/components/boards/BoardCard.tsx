'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layers, FileText, MoreHorizontal, Copy, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { BoardSettings } from '@/types';
import { getBoardBackgroundStyle } from '@/lib/board-backgrounds';
import { cn } from '@/lib/utils';

interface BoardMemberInfo {
  id: string;
  name: string | null;
  image: string | null;
}

interface BoardCardProps {
  id: string;
  name: string;
  description: string | null;
  listCount: number;
  memberCount: number;
  members?: BoardMemberInfo[];
  isTemplate?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isArchived?: boolean;
  settings?: BoardSettings;
  onDeleted?: () => void;
}

export function BoardCard({
  id,
  name,
  description,
  listCount,
  memberCount,
  members = [],
  isTemplate = false,
  isAdmin = false,
  isSuperAdmin = false,
  isArchived = false,
  settings,
  onDeleted,
}: BoardCardProps) {
  const router = useRouter();
  const [isCloning, setIsCloning] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const iconBg = isArchived ? 'bg-text-tertiary/10' : isTemplate ? 'bg-warning/10' : 'bg-card-epic/10';
  const iconColor = isArchived ? 'text-text-tertiary' : isTemplate ? 'text-warning' : 'text-card-epic';
  const hoverColor = isArchived ? 'group-hover:text-text-secondary' : isTemplate ? 'group-hover:text-warning' : 'group-hover:text-card-epic';
  const bgStyle = settings ? getBoardBackgroundStyle(settings) : undefined;
  const canManage = isAdmin || isSuperAdmin;
  const canDelete = isArchived && canManage;

  const getErrorMessage = async (response: Response) => {
    const fallback = `Request failed (${response.status} ${response.statusText})`;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => null) as
        | { error?: { message?: string }; message?: string }
        | null;
      return payload?.error?.message || payload?.message || fallback;
    }

    const text = await response.text().catch(() => '');
    return text || fallback;
  };

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
        const message = result?.error?.message || `Request failed (${response.status} ${response.statusText})`;
        console.error('Failed to clone board:', message);
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
        console.error('Failed to archive board:', await getErrorMessage(response));
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
        console.error('Failed to unarchive board:', await getErrorMessage(response));
      }
    } catch (error) {
      console.error('Failed to unarchive board:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDeletePermanently = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Permanently delete board "${name}"? This cannot be undone. All lists, cards, and data will be lost.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/boards/${id}?permanent=true`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDeleted?.();
        router.refresh();
      } else {
        console.error('Failed to delete board:', await getErrorMessage(response));
      }
    } catch (error) {
      console.error('Failed to delete board:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const cardContent = (
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
        <div className="mt-2 flex items-center justify-between">
          <span className="text-caption text-text-tertiary">{listCount} lists</span>
          {members.length > 0 ? (
            <div className="flex -space-x-1.5">
              {members.slice(0, 5).map((member) => (
                <Avatar key={member.id} className="h-5 w-5 border border-surface">
                  <AvatarImage src={member.image || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {(member.name || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {members.length > 5 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-surface bg-surface-raised text-[8px] text-text-tertiary">
                  +{members.length - 5}
                </div>
              )}
            </div>
          ) : (
            <span className="text-caption text-text-tertiary">{memberCount} members</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border overflow-hidden transition-colors',
        !bgStyle && 'bg-surface hover:bg-surface-raised'
      )}
      style={bgStyle}
    >
      <Link
        href={`/boards/${id}`}
        className={cn('block', bgStyle ? 'p-2' : 'p-4')}
      >
        {bgStyle ? (
          <div className="w-1/2 rounded-md bg-surface p-3">
            {cardContent}
          </div>
        ) : (
          cardContent
        )}
      </Link>

      {/* Admin Actions Menu */}
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.preventDefault()}
              className={cn(
                'absolute rounded-md p-1.5 opacity-0 transition-opacity hover:bg-surface-hover group-hover:opacity-100 focus:opacity-100',
                bgStyle ? 'right-3 top-3' : 'right-2 top-2'
              )}
              disabled={isCloning || isArchiving || isDeleting}
            >
              <MoreHorizontal className="h-4 w-4 text-text-secondary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {isArchived ? (
              <>
                <DropdownMenuItem
                  onClick={handleUnarchive}
                  disabled={isArchiving}
                >
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  {isArchiving ? 'Restoring...' : 'Restore Board'}
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDeletePermanently}
                      disabled={isDeleting}
                      className="text-error focus:text-error"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                    </DropdownMenuItem>
                  </>
                )}
              </>
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
