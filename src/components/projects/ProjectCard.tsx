'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, Users, MoreHorizontal, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { BoardSettings } from '@/types';
import { formatDisplayDate } from '@/lib/date-utils';
import { getBoardBackgroundStyle } from '@/lib/board-backgrounds';
import { cn } from '@/lib/utils';

interface ProjectMember {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface ProjectCardProps {
  id: string;
  name: string;
  teamName: string | null;
  teamColor: string | null;
  members: ProjectMember[];
  settings: BoardSettings | null;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isArchived?: boolean;
  onDeleted?: () => void;
}

export function ProjectCard({
  id,
  name,
  teamName,
  teamColor,
  members,
  settings,
  isAdmin = false,
  isSuperAdmin = false,
  isArchived = false,
  onDeleted,
}: ProjectCardProps) {
  const queryClient = useQueryClient();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const startDate = settings?.projectStartDate;
  const lastTweak = settings?.lastDayAnimationTweaks;
  const releaseDate = settings?.releaseDate;
  const bgStyle = settings ? getBoardBackgroundStyle(settings) : undefined;
  const canManage = isAdmin || isSuperAdmin;

  const displayMembers = members.slice(0, 5);
  const remainingCount = members.length - 5;

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Archive project "${name}"? It will be hidden from the projects list but can be restored later.`)) {
      return;
    }
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/boards/${id}`, { method: 'DELETE' });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['projects', 'archived'] });
      } else {
        console.error('Failed to archive project');
      }
    } catch (error) {
      console.error('Failed to archive project:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/boards/${id}/unarchive`, { method: 'POST' });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['projects', 'archived'] });
        onDeleted?.();
      } else {
        console.error('Failed to restore project');
      }
    } catch (error) {
      console.error('Failed to restore project:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDeletePermanently = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Permanently delete project "${name}"? This cannot be undone. All lists, cards, and data will be lost.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/boards/${id}?permanent=true`, { method: 'DELETE' });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['projects', 'archived'] });
        onDeleted?.();
      } else {
        console.error('Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const cardContent = (
    <div className="space-y-3">
      {/* Project name + team */}
      <div>
        <div className="flex items-center gap-2">
          <h3 className={cn(
            'text-title font-semibold truncate',
            isArchived ? 'text-text-tertiary' : 'text-text-primary group-hover:text-primary'
          )}>
            {name}
          </h3>
          {isArchived && (
            <span className="shrink-0 rounded bg-text-tertiary/10 px-1.5 py-0.5 text-tiny font-medium text-text-tertiary">
              Archived
            </span>
          )}
        </div>
        {teamName && (
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: teamColor || '#71717a' }}
            />
            <span className="text-caption text-text-secondary truncate">{teamName}</span>
          </div>
        )}
      </div>

      {/* Member avatars */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {displayMembers.map(({ user }) => (
            <Avatar key={user.id} className="h-7 w-7 border-2 border-surface">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="text-tiny">
                {(user.name || user.email)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {remainingCount > 0 && (
            <div className="h-7 w-7 rounded-full border-2 border-surface bg-surface-active flex items-center justify-center text-tiny font-medium text-text-secondary">
              +{remainingCount}
            </div>
          )}
        </div>
        <span className="text-caption text-text-tertiary">
          <Users className="h-3 w-3 inline mr-0.5" />
          {members.length}
        </span>
      </div>

      {/* Dates */}
      {(startDate || lastTweak || releaseDate) && (
        <div className="flex flex-wrap gap-2">
          {startDate && (
            <div className="flex items-center gap-1 text-caption text-text-tertiary">
              <Calendar className="h-3 w-3" />
              <span>Start: {formatDisplayDate(startDate)}</span>
            </div>
          )}
          {lastTweak && (
            <div className="text-caption text-text-tertiary">
              Tweak: {formatDisplayDate(lastTweak)}
            </div>
          )}
          {releaseDate && (
            <div className="text-caption text-success font-medium">
              Release: {formatDisplayDate(releaseDate)}
            </div>
          )}
        </div>
      )}
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
        href={`/projects/${id}`}
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
              disabled={isArchiving || isDeleting}
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
                  {isArchiving ? 'Restoring...' : 'Restore Project'}
                </DropdownMenuItem>
                {isSuperAdmin && (
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
              <DropdownMenuItem
                onClick={handleArchive}
                disabled={isArchiving}
                className="text-warning focus:text-warning"
              >
                <Archive className="mr-2 h-4 w-4" />
                {isArchiving ? 'Archiving...' : 'Archive Project'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
