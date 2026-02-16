'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BurnupSparkline } from '@/components/projects/BurnupSparkline';
import type { BoardSettings, WeeklyProgress } from '@/types';
import { formatDisplayDate } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface ProjectMember {
  id: string;
  userId: string;
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
  weeklyProgress: WeeklyProgress[];
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
  weeklyProgress,
  isAdmin = false,
  isSuperAdmin = false,
  isArchived = false,
  onDeleted,
}: ProjectCardProps) {
  const queryClient = useQueryClient();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const startDate = settings?.projectStartDate;
  const releaseDate = settings?.releaseDate;
  const roleAssignments = settings?.projectRoleAssignments;
  const canManage = isAdmin || isSuperAdmin;

  // Build role→member mapping
  const roleRows = useMemo(() => {
    if (!roleAssignments || roleAssignments.length === 0) return null;
    const memberMap = new Map(members.map((m) => [m.userId, m.user]));
    return roleAssignments
      .filter((ra) => ra.userId && memberMap.has(ra.userId))
      .map((ra) => ({
        id: ra.id,
        roleName: ra.roleName,
        roleColor: ra.roleColor ?? null,
        user: memberMap.get(ra.userId)!,
      }));
  }, [roleAssignments, members]);

  // Progress summary from latest weekly data
  const progressSummary = useMemo(() => {
    if (!weeklyProgress || weeklyProgress.length === 0) return null;
    const sorted = [...weeklyProgress].sort(
      (a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime(),
    );
    const latest = sorted[0];
    const pct =
      latest.totalStoryPoints > 0
        ? Math.round((latest.completedPoints / latest.totalStoryPoints) * 100)
        : 0;
    return {
      completed: latest.completedPoints,
      total: latest.totalStoryPoints,
      pct,
    };
  }, [weeklyProgress]);

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Archive project "${name}"? It will be hidden from the projects list but can be restored later.`)) {
      return;
    }
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/boards/${id}?scope=project`, { method: 'DELETE' });
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
      const response = await fetch(`/api/boards/${id}/unarchive?scope=project`, { method: 'POST' });
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

  const displayMembers = members.slice(0, 5);
  const remainingCount = members.length - 5;

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border overflow-hidden transition-colors bg-surface hover:bg-surface-raised',
        isArchived && 'opacity-75',
      )}
    >
      <Link href={`/projects/${id}`} className="block">
        {/* Header: Project name */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <h3
            className={cn(
              'text-title font-semibold truncate flex-1',
              isArchived ? 'text-text-tertiary' : 'text-text-primary group-hover:text-primary',
            )}
          >
            {name}
          </h3>
          {isArchived && (
            <span className="shrink-0 rounded bg-text-tertiary/10 px-1.5 py-0.5 text-tiny font-medium text-text-tertiary">
              Archived
            </span>
          )}
        </div>

        {/* Team color bar */}
        {teamName && (
          <div
            className="px-3 py-1.5 text-tiny font-semibold uppercase tracking-wide truncate"
            style={{
              backgroundColor: teamColor || '#71717a',
              color: '#fff',
            }}
          >
            {teamName}
          </div>
        )}

        {/* Roles list OR avatar fallback */}
        <div className="px-4 py-2">
          {roleRows && roleRows.length > 0 ? (
            <div className="space-y-1.5">
              {roleRows.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-semibold uppercase w-10 shrink-0 truncate"
                    style={{ color: row.roleColor || '#71717a' }}
                  >
                    {row.roleName}
                  </span>
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarImage src={row.user.image || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {(row.user.name || row.user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-caption text-text-secondary truncate">
                    {row.user.name || row.user.email}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {displayMembers.map(({ user }) => (
                  <Avatar key={user.id} className="h-6 w-6 border border-surface">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {(user.name || user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {remainingCount > 0 && (
                  <div className="h-6 w-6 rounded-full border border-surface bg-surface-raised flex items-center justify-center text-[8px] text-text-tertiary">
                    +{remainingCount}
                  </div>
                )}
              </div>
              <span className="text-caption text-text-tertiary">{members.length} members</span>
            </div>
          )}
        </div>

        {/* Burnup sparkline + progress */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <BurnupSparkline data={weeklyProgress} height={36} />
            </div>
            {progressSummary && (
              <span className="text-[10px] text-text-tertiary whitespace-nowrap shrink-0">
                {progressSummary.completed}/{progressSummary.total} SP ({progressSummary.pct}%)
              </span>
            )}
          </div>
        </div>

        {/* Dates footer */}
        {(startDate || releaseDate) && (
          <div className="px-4 pb-3 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-tertiary">
            {startDate && (
              <span>Start: {formatDisplayDate(startDate, { month: 'short', day: 'numeric' })}</span>
            )}
            {releaseDate && (
              <span className="text-success font-medium">
                Release: {formatDisplayDate(releaseDate, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        )}
      </Link>

      {/* Admin Actions Menu */}
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.preventDefault()}
              className="absolute right-2 top-2 rounded-md p-1.5 opacity-0 transition-opacity hover:bg-surface-hover group-hover:opacity-100 focus:opacity-100"
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
