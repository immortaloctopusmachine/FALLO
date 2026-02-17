'use client';

import Link from 'next/link';
import { ArrowLeft, Settings, CheckSquare, Layers, Bone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { BoardViewMode, BoardSettings } from '@/types';
import { getProjectDisplayName } from '@/lib/project-utils';
import { cn } from '@/lib/utils';

interface BoardHeaderMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface BoardHeaderProps {
  name: string;
  settings?: BoardSettings;
  memberCount: number;
  members: BoardHeaderMember[];
  viewMode?: BoardViewMode;
  onViewModeChange?: (mode: BoardViewMode) => void;
  onSettingsClick?: () => void;
  onMembersClick?: () => void;
  showSettings?: boolean;
}

export function BoardHeader({
  name,
  settings,
  memberCount,
  members,
  viewMode = 'tasks',
  onViewModeChange,
  onSettingsClick,
  onMembersClick,
  showSettings = true,
}: BoardHeaderProps) {
  const displayMembers = members.slice(0, 6);
  const remainingCount = Math.max(0, memberCount - displayMembers.length);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        <Link href="/boards">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-title font-semibold">{getProjectDisplayName(name, settings)}</h1>
      </div>

      {/* View Toggle */}
      {onViewModeChange && (
        <div className="flex items-center gap-1 rounded-lg bg-surface-hover p-1">
          <button
            onClick={() => onViewModeChange('tasks')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-caption font-medium transition-colors',
              viewMode === 'tasks'
                ? 'bg-background text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Tasks
          </button>
          <button
            onClick={() => onViewModeChange('planning')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-caption font-medium transition-colors',
              viewMode === 'planning'
                ? 'bg-background text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Planning
          </button>
          <button
            onClick={() => onViewModeChange('spine')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-caption font-medium transition-colors',
              viewMode === 'spine'
                ? 'bg-background text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            <Bone className="h-3.5 w-3.5" />
            Spine
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={onMembersClick}
        >
          {displayMembers.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {displayMembers.map((member) => (
                  <Avatar key={member.id} className="h-6 w-6 border-2 border-surface">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback className="text-[9px]">
                      {(member.name || member.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {remainingCount > 0 && (
                  <div className="h-6 w-6 rounded-full border-2 border-surface bg-surface-active flex items-center justify-center text-[9px] font-medium text-text-secondary">
                    +{remainingCount}
                  </div>
                )}
              </div>
              <span className="text-caption text-text-tertiary">{memberCount}</span>
            </div>
          ) : (
            <span className="text-caption text-text-tertiary">0 members</span>
          )}
        </Button>
        {showSettings && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onSettingsClick}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
