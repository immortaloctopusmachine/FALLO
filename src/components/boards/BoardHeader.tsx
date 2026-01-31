'use client';

import Link from 'next/link';
import { ArrowLeft, Settings, Users, CheckSquare, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BoardViewMode } from '@/types';
import { cn } from '@/lib/utils';

interface BoardHeaderProps {
  name: string;
  memberCount: number;
  viewMode?: BoardViewMode;
  onViewModeChange?: (mode: BoardViewMode) => void;
  onSettingsClick?: () => void;
  onMembersClick?: () => void;
}

export function BoardHeader({ name, memberCount, viewMode = 'tasks', onViewModeChange, onSettingsClick, onMembersClick }: BoardHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        <Link href="/boards">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-title font-semibold">{name}</h1>
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
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2"
          onClick={onMembersClick}
        >
          <Users className="h-4 w-4" />
          <span className="text-caption">{memberCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onSettingsClick}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
