'use client';

import { useMemo, useState } from 'react';
import { Plus, ChevronRight, ChevronDown, Copy, Trash2, Search, FolderPlus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { Skeleton } from '@/types/spine-tracker';
import { DEFAULT_SKELETON_GROUPS, PROTECTED_GROUPS, STATUS_COLORS, getZOrderColor } from './constants';

interface SkeletonNavigatorProps {
  skeletons: Skeleton[];
  customGroups: Record<string, string>;
  groupOrder: string[];
  selectedSkeletonId: string | null;
  collapsedGroups: Set<string>;
  searchQuery: string;
  showGenericSkeletons: boolean;
  onSearchChange: (query: string) => void;
  onToggleShowGenericSkeletons: (show: boolean) => void;
  onSelectSkeleton: (id: string) => void;
  onAddSkeleton: () => void;
  onAddCustomGroup: (label: string) => string | null;
  onDeleteGroup: (groupId: string) => void;
  onMoveSkeletonToGroup: (skeletonId: string, groupId: string) => void;
  onDuplicateSkeleton: (id: string) => void;
  onDeleteSkeleton: (id: string) => void;
  onToggleGroup: (groupId: string) => void;
}

export function SkeletonNavigator({
  skeletons,
  customGroups,
  groupOrder,
  selectedSkeletonId,
  collapsedGroups,
  searchQuery,
  showGenericSkeletons,
  onSearchChange,
  onToggleShowGenericSkeletons,
  onSelectSkeleton,
  onAddSkeleton,
  onAddCustomGroup,
  onDeleteGroup,
  onMoveSkeletonToGroup,
  onDuplicateSkeleton,
  onDeleteSkeleton,
  onToggleGroup,
}: SkeletonNavigatorProps) {
  const [draggingSkeletonId, setDraggingSkeletonId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const groupMap = useMemo(() => {
    const map = new Map<string, { id: string; label: string; icon: string }>();
    DEFAULT_SKELETON_GROUPS.forEach((group) => map.set(group.id, group));
    Object.entries(customGroups).forEach(([groupId, label]) => {
      map.set(groupId, {
        id: groupId,
        label,
        icon: '#',
      });
    });
    return map;
  }, [customGroups]);

  const skeletonById = useMemo(
    () => new Map(skeletons.map((skeleton) => [skeleton.id, skeleton])),
    [skeletons]
  );

  const filteredSkeletons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return skeletons.filter((skeleton) => {
      if (!showGenericSkeletons && skeleton.isGeneric) return false;
      if (!q) return true;
      return (
        skeleton.name.toLowerCase().includes(q) ||
        skeleton.description.toLowerCase().includes(q)
      );
    });
  }, [skeletons, searchQuery, showGenericSkeletons]);

  const groupedSkeletons = useMemo(() => {
    const groups: Record<string, Skeleton[]> = {};
    groupOrder.forEach((groupId) => {
      groups[groupId] = [];
    });

    filteredSkeletons.forEach((skeleton) => {
      const groupId = skeleton.group || 'other';
      if (!groups[groupId]) groups[groupId] = [];
      groups[groupId].push(skeleton);
    });

    Object.values(groups).forEach((entries) => entries.sort((a, b) => a.zOrder - b.zOrder));
    return groups;
  }, [filteredSkeletons, groupOrder]);

  const handleAddGroup = () => {
    const label = window.prompt('New group name');
    if (!label) return;
    const created = onAddCustomGroup(label);
    if (!created) {
      alert('Group name is required.');
    }
  };

  const handleDropOnGroup = (groupId: string, transferSkeletonId?: string) => {
    const skeletonId = transferSkeletonId || draggingSkeletonId;
    setDragOverGroupId(null);
    setDraggingSkeletonId(null);

    if (!skeletonId) return;

    const draggingSkeleton = skeletonById.get(skeletonId);
    if (!draggingSkeleton || draggingSkeleton.group === groupId) return;

    onMoveSkeletonToGroup(skeletonId, groupId);
  };

  return (
    <div className="flex h-full flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-caption font-semibold text-text-primary">
              Skeletons ({filteredSkeletons.length})
            </p>
            <p className="text-[11px] text-text-tertiary">Generic Skeletons</p>
            <div className="mt-1 flex items-center gap-2">
              <Switch
                checked={showGenericSkeletons}
                onCheckedChange={(checked) => onToggleShowGenericSkeletons(checked)}
              />
              <span className="text-[11px] text-text-tertiary">
                {showGenericSkeletons ? 'Shown' : 'Hidden'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleAddGroup} title="Add group">
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onAddSkeleton} title="Add skeleton">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="h-7 pl-7 text-caption"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groupOrder.map((groupId) => {
          const group = groupMap.get(groupId);
          const groupLabel = group?.label || groupId;
          const groupIcon = group?.icon || '#';
          const items = groupedSkeletons[groupId] || [];
          const isCollapsed = collapsedGroups.has(groupId);
          const canDeleteGroup = Boolean(customGroups[groupId]) && !PROTECTED_GROUPS.includes(groupId);

          if (!group && items.length === 0) return null;

          return (
            <div
              key={groupId}
              className={dragOverGroupId === groupId ? 'bg-blue-600/10' : ''}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverGroupId(groupId);
              }}
              onDragLeave={() => {
                setDragOverGroupId((prev) => (prev === groupId ? null : prev));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const transferSkeletonId = event.dataTransfer.getData('text/plain');
                handleDropOnGroup(groupId, transferSkeletonId);
              }}
            >
              <div className="group flex items-center px-3 py-1.5">
                <button
                  className="flex min-w-0 flex-1 items-center text-left hover:bg-surface-hover/50 transition-colors"
                  onClick={() => onToggleGroup(groupId)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="mr-1.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                  ) : (
                    <ChevronDown className="mr-1.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                  )}
                  <span className="mr-1.5">{groupIcon}</span>
                  <span className="flex-1 truncate text-caption font-medium text-text-secondary">
                    {groupLabel}
                  </span>
                  <span className="text-xs text-text-tertiary">{items.length}</span>
                </button>
                {canDeleteGroup ? (
                  <button
                    className="ml-1 hidden rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-red-400 group-hover:block"
                    onClick={() => onDeleteGroup(groupId)}
                    title={`Delete group ${groupLabel}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                ) : null}
              </div>

              {!isCollapsed ? (
                <div className="pb-1">
                  {items.map((skeleton) => {
                    const isSelected = skeleton.id === selectedSkeletonId;
                    const statusColor = STATUS_COLORS[skeleton.status];
                    const zColor = getZOrderColor(skeleton.zOrder);

                    return (
                      <div
                        key={skeleton.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', skeleton.id);
                          setDraggingSkeletonId(skeleton.id);
                        }}
                        onDragEnd={() => {
                          setDraggingSkeletonId(null);
                          setDragOverGroupId(null);
                        }}
                        className={`group mx-1 ml-2 flex cursor-pointer items-center rounded border px-3 py-1 transition-colors ${
                          isSelected
                            ? 'border-blue-500/30 bg-blue-600/20'
                            : 'border-transparent hover:bg-surface-hover/50'
                        }`}
                        onClick={() => onSelectSkeleton(skeleton.id)}
                      >
                        <GripVertical className="mr-1.5 h-3 w-3 shrink-0 text-text-tertiary" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-mono text-caption text-text-primary">
                              {skeleton.name}
                            </span>
                            {skeleton.isGeneric ? (
                              <span className="rounded bg-slate-700 px-1 py-0 text-[10px] text-slate-100">
                                generic
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1">
                            <span className={`rounded px-1 py-0 text-[10px] font-mono text-white ${zColor}`}>
                              z:{skeleton.zOrder}
                            </span>
                            <span
                              className={`rounded px-1 py-0 text-[10px] font-mono ${statusColor?.bg || ''} ${statusColor?.text || ''}`}
                            >
                              {skeleton.status}
                            </span>
                            <span className="text-[10px] text-text-tertiary">
                              {skeleton.animations.length} anim
                            </span>
                          </div>
                        </div>

                        <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                          <button
                            className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-secondary"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDuplicateSkeleton(skeleton.id);
                            }}
                            title="Duplicate"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          {!skeleton.isLayoutTemplate ? (
                            <button
                              className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-red-400"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeleteSkeleton(skeleton.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 ? (
                    <p className="px-6 py-1 text-[10px] text-text-tertiary">Empty</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
