'use client';

import { useMemo } from 'react';
import { Plus, ChevronRight, ChevronDown, Copy, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Skeleton } from '@/types/spine-tracker';
import { DEFAULT_SKELETON_GROUPS, STATUS_COLORS, getZOrderColor } from './constants';

interface SkeletonNavigatorProps {
  skeletons: Skeleton[];
  groupOrder: string[];
  selectedSkeletonId: string | null;
  collapsedGroups: Set<string>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectSkeleton: (id: string) => void;
  onAddSkeleton: () => void;
  onDuplicateSkeleton: (id: string) => void;
  onDeleteSkeleton: (id: string) => void;
  onToggleGroup: (groupId: string) => void;
}

export function SkeletonNavigator({
  skeletons,
  groupOrder,
  selectedSkeletonId,
  collapsedGroups,
  searchQuery,
  onSearchChange,
  onSelectSkeleton,
  onAddSkeleton,
  onDuplicateSkeleton,
  onDeleteSkeleton,
  onToggleGroup,
}: SkeletonNavigatorProps) {
  const groupMap = useMemo(() => {
    const map = new Map<string, typeof DEFAULT_SKELETON_GROUPS[0]>();
    DEFAULT_SKELETON_GROUPS.forEach((g) => map.set(g.id, g));
    return map;
  }, []);

  const filteredSkeletons = useMemo(() => {
    if (!searchQuery.trim()) return skeletons;
    const q = searchQuery.toLowerCase();
    return skeletons.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [skeletons, searchQuery]);

  const groupedSkeletons = useMemo(() => {
    const groups: Record<string, Skeleton[]> = {};
    groupOrder.forEach((gid) => {
      groups[gid] = [];
    });
    filteredSkeletons.forEach((s) => {
      const g = s.group || 'other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(s);
    });
    // Sort each group by z-order
    Object.values(groups).forEach((arr) => arr.sort((a, b) => a.zOrder - b.zOrder));
    return groups;
  }, [filteredSkeletons, groupOrder]);

  return (
    <div className="flex flex-col h-full border-r border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-caption font-semibold text-text-primary">
          Skeletons ({skeletons.length})
        </span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onAddSkeleton} title="Add skeleton">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="h-7 pl-7 text-caption"
          />
        </div>
      </div>

      {/* Groups + skeleton list */}
      <div className="flex-1 overflow-y-auto">
        {groupOrder.map((groupId) => {
          const group = groupMap.get(groupId);
          const items = groupedSkeletons[groupId] || [];
          const isCollapsed = collapsedGroups.has(groupId);

          if (!group && items.length === 0) return null;

          return (
            <div key={groupId}>
              {/* Group header */}
              <button
                className="flex items-center w-full px-3 py-1.5 text-left hover:bg-surface-hover/50 transition-colors"
                onClick={() => onToggleGroup(groupId)}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 text-text-tertiary mr-1.5 shrink-0" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-text-tertiary mr-1.5 shrink-0" />
                )}
                <span className="mr-1.5">{group?.icon || '📦'}</span>
                <span className="text-caption font-medium text-text-secondary flex-1">
                  {group?.label || groupId}
                </span>
                <span className="text-xs text-text-tertiary">{items.length}</span>
              </button>

              {/* Skeleton items */}
              {!isCollapsed && (
                <div className="pb-1">
                  {items.map((skeleton) => {
                    const isSelected = skeleton.id === selectedSkeletonId;
                    const statusColor = STATUS_COLORS[skeleton.status];
                    const zColor = getZOrderColor(skeleton.zOrder);

                    return (
                      <div
                        key={skeleton.id}
                        className={`group flex items-center px-3 py-1 ml-2 mr-1 rounded cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-600/20 border border-blue-500/30'
                            : 'hover:bg-surface-hover/50 border border-transparent'
                        }`}
                        onClick={() => onSelectSkeleton(skeleton.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-caption font-mono text-text-primary truncate">
                              {skeleton.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`px-1 py-0 rounded text-[10px] font-mono text-white ${zColor}`}>
                              z:{skeleton.zOrder}
                            </span>
                            <span
                              className={`px-1 py-0 rounded text-[10px] font-mono ${statusColor?.bg || ''} ${statusColor?.text || ''}`}
                            >
                              {skeleton.status}
                            </span>
                            <span className="text-[10px] text-text-tertiary">
                              {skeleton.animations.length} anim
                            </span>
                          </div>
                        </div>
                        {/* Hover actions */}
                        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                          <button
                            className="p-1 rounded hover:bg-surface-hover text-text-tertiary hover:text-text-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateSkeleton(skeleton.id);
                            }}
                            title="Duplicate"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          {!skeleton.isLayoutTemplate && (
                            <button
                              className="p-1 rounded hover:bg-surface-hover text-text-tertiary hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSkeleton(skeleton.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <p className="text-[10px] text-text-tertiary px-6 py-1">Empty</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
