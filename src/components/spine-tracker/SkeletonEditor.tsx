'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Skeleton, Animation, SoundFx, Skin, SpineEvent } from '@/types/spine-tracker';
import { SKELETON_STATUSES, STATUS_COLORS, DEFAULT_SKELETON_GROUPS } from './constants';
import { AnimationTable } from './AnimationTable';
import { SkeletonPlacement } from './SkeletonPlacement';
import { SkinsEventsPanel } from './SkinsEventsPanel';

interface SpineTaskOption {
  id: string;
  title: string;
  listName: string;
}

interface SkeletonEditorProps {
  skeleton: Skeleton;
  allSkeletons: Skeleton[];
  groupOrder: string[];
  customGroups: Record<string, string>;
  availableTaskOptions: SpineTaskOption[];
  editMode: boolean;
  onSetEditMode: (v: boolean) => void;
  onUpdate: (updates: Partial<Skeleton>) => void;
  onAddAnimation: () => void;
  onUpdateAnimation: (index: number, updates: Partial<Animation>) => void;
  onDeleteAnimation: (index: number) => void;
  onAddSoundFx: (animIndex: number) => void;
  onUpdateSoundFx: (animIndex: number, sfxIndex: number, updates: Partial<SoundFx>) => void;
  onDeleteSoundFx: (animIndex: number, sfxIndex: number) => void;
  onAddSkin: () => void;
  onUpdateSkin: (index: number, updates: Partial<Skin>) => void;
  onDeleteSkin: (index: number) => void;
  onAddEvent: () => void;
  onUpdateEvent: (index: number, updates: Partial<SpineEvent>) => void;
  onDeleteEvent: (index: number) => void;
}

export function SkeletonEditor({
  skeleton,
  allSkeletons,
  groupOrder,
  customGroups,
  availableTaskOptions,
  editMode,
  onSetEditMode,
  onUpdate,
  onAddAnimation,
  onUpdateAnimation,
  onDeleteAnimation,
  onAddSoundFx,
  onUpdateSoundFx,
  onDeleteSoundFx,
  onAddSkin,
  onUpdateSkin,
  onDeleteSkin,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
}: SkeletonEditorProps) {
  const [manualTaskInput, setManualTaskInput] = useState('');
  const [selectedTaskOptionId, setSelectedTaskOptionId] = useState('__none__');
  const notesTintClass = 'border-orange-500/30 bg-orange-500/10';

  useEffect(() => {
    setManualTaskInput('');
    setSelectedTaskOptionId('__none__');
  }, [skeleton.id]);

  const groupLabelMap = useMemo(() => {
    const map = new Map<string, { label: string; icon: string }>();
    DEFAULT_SKELETON_GROUPS.forEach((group) => map.set(group.id, { label: group.label, icon: group.icon }));
    Object.entries(customGroups).forEach(([groupId, label]) => {
      map.set(groupId, { label, icon: '#' });
    });
    return map;
  }, [customGroups]);

  const groupOptions = useMemo(() => {
    return groupOrder.map((groupId) => {
      const entry = groupLabelMap.get(groupId);
      return {
        id: groupId,
        label: entry?.label || groupId,
        icon: entry?.icon || '#',
      };
    });
  }, [groupLabelMap, groupOrder]);

  const taskOptionsById = useMemo(() => {
    return new Map(availableTaskOptions.map((task) => [task.id, task]));
  }, [availableTaskOptions]);

  const connectedTasks = skeleton.connectedTasks || [];

  const addConnectedTask = (rawTaskName: string) => {
    const taskName = rawTaskName.trim();
    if (!taskName) return;

    const existing = new Set(connectedTasks.map((task) => task.toLowerCase()));
    if (existing.has(taskName.toLowerCase())) return;

    onUpdate({
      connectedTasks: [...connectedTasks, taskName],
    });
  };

  const removeConnectedTask = (taskName: string) => {
    onUpdate({
      connectedTasks: connectedTasks.filter((task) => task !== taskName),
    });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="shrink-0 border-b border-border bg-surface px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {skeleton.isLayoutTemplate ? (
              <span className="rounded bg-amber-600 px-2 py-0.5 text-xs font-bold text-amber-100">
                MASTER
              </span>
            ) : null}
            {skeleton.isGeneric ? (
              <span className="rounded bg-slate-700 px-2 py-0.5 text-xs font-mono text-slate-100">
                generic
              </span>
            ) : null}
          </div>
          {editMode ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-caption"
              onClick={() => onSetEditMode(false)}
            >
              <X className="h-3 w-3" /> Done
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-caption"
              onClick={() => onSetEditMode(true)}
            >
              <Edit2 className="h-3 w-3" /> Edit
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {skeleton.previewImageDataUrl ? (
          <div className="rounded border border-border bg-surface p-2">
            <p className="mb-2 text-xs text-text-tertiary">Preview</p>
            <div className="flex justify-center rounded border border-border/50 bg-black/20 p-2">
              <Image
                src={skeleton.previewImageDataUrl}
                alt={`${skeleton.name} preview`}
                width={320}
                height={176}
                className="max-h-44 w-auto max-w-full object-contain"
                unoptimized
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {editMode ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-text-tertiary">Name</label>
                  <Input
                    value={skeleton.name}
                    onChange={(e) => onUpdate({ name: e.target.value.toUpperCase() })}
                    className="h-8 text-caption font-mono font-bold"
                    disabled={skeleton.isLayoutTemplate}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-tertiary">Description</label>
                  <Input
                    value={skeleton.description}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                    className={`h-8 text-caption ${notesTintClass}`}
                    placeholder="Brief description"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-text-tertiary">Group</label>
                  <Select value={skeleton.group} onValueChange={(v) => onUpdate({ group: v })}>
                    <SelectTrigger className="h-8 text-caption">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {groupOptions.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-tertiary">Z-Order</label>
                  <Input
                    type="number"
                    min={0}
                    max={999}
                    value={skeleton.zOrder}
                    onChange={(e) => onUpdate({ zOrder: parseInt(e.target.value, 10) || 0 })}
                    className="h-8 text-caption"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-tertiary">Status</label>
                  <Select
                    value={skeleton.status}
                    onValueChange={(v) => onUpdate({ status: v as Skeleton['status'] })}
                  >
                    <SelectTrigger className={`h-7 text-[11px] font-mono border-0 rounded px-2 py-0.5 ${STATUS_COLORS[skeleton.status]?.bg || ''} ${STATUS_COLORS[skeleton.status]?.text || ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SKELETON_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[s]?.bg || ''}`} />
                            {s}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-tertiary">Generic</label>
                  <div className="flex h-8 items-center gap-2 rounded border border-border px-2">
                    <Switch
                      checked={Boolean(skeleton.isGeneric)}
                      onCheckedChange={(checked) => onUpdate({ isGeneric: checked })}
                    />
                    <span className="text-xs text-text-secondary">
                      {skeleton.isGeneric ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold font-mono text-text-primary">{skeleton.name}</h2>
              {skeleton.description ? (
                <p className={`rounded border px-3 py-2 text-caption text-text-secondary ${notesTintClass}`}>
                  {skeleton.description}
                </p>
              ) : null}
            </>
          )}
        </div>

        <SkeletonPlacement
          placement={skeleton.placement}
          editMode={editMode}
          allSkeletons={allSkeletons}
          onUpdate={(updates) =>
            onUpdate({ placement: { ...skeleton.placement, ...updates } })
          }
        />

        <AnimationTable
          animations={skeleton.animations}
          events={skeleton.events}
          editMode={editMode}
          onAdd={onAddAnimation}
          onUpdate={onUpdateAnimation}
          onDelete={onDeleteAnimation}
          onAddSoundFx={onAddSoundFx}
          onUpdateSoundFx={onUpdateSoundFx}
          onDeleteSoundFx={onDeleteSoundFx}
        />

        <SkinsEventsPanel
          skins={skeleton.skins}
          editMode={editMode}
          onAddSkin={onAddSkin}
          onUpdateSkin={onUpdateSkin}
          onDeleteSkin={onDeleteSkin}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-caption font-semibold text-text-primary">
              Connected Tasks ({connectedTasks.length})
            </h3>
          </div>

          {editMode ? (
            <div className="space-y-2 rounded border border-border p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={manualTaskInput}
                  onChange={(e) => setManualTaskInput(e.target.value)}
                  className="h-8 text-caption"
                  placeholder="Add task manually"
                />
                <Button
                  variant="outline"
                  className="h-8 gap-1 text-caption"
                  onClick={() => {
                    addConnectedTask(manualTaskInput);
                    setManualTaskInput('');
                  }}
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Select value={selectedTaskOptionId} onValueChange={setSelectedTaskOptionId}>
                  <SelectTrigger className="h-8 text-caption">
                    <SelectValue placeholder="Select task from board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select task from board</SelectItem>
                    {availableTaskOptions.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title} ({task.listName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="h-8 gap-1 text-caption"
                  onClick={() => {
                    if (selectedTaskOptionId === '__none__') return;
                    const selected = taskOptionsById.get(selectedTaskOptionId);
                    if (!selected) return;
                    addConnectedTask(selected.title);
                    setSelectedTaskOptionId('__none__');
                  }}
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>

              {connectedTasks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {connectedTasks.map((taskName) => (
                    <span
                      key={taskName}
                      className="inline-flex items-center gap-1 rounded border border-border bg-surface-hover px-2 py-1 text-xs text-text-secondary"
                    >
                      {taskName}
                      <button
                        className="rounded p-0.5 text-text-tertiary hover:bg-surface-hover hover:text-red-400"
                        onClick={() => removeConnectedTask(taskName)}
                        title={`Remove ${taskName}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-caption text-text-tertiary">No connected tasks</p>
              )}
            </div>
          ) : (
            <div className="rounded border border-border/50 bg-surface-hover/20 p-3">
              {connectedTasks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {connectedTasks.map((taskName) => (
                    <span
                      key={taskName}
                      className="rounded border border-border px-2 py-1 text-xs text-text-secondary"
                    >
                      {taskName}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-caption text-text-tertiary">No connected tasks</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-caption font-semibold text-text-primary">General Notes</h3>
          {editMode ? (
            <Textarea
              value={skeleton.generalNotes}
              onChange={(e) => onUpdate({ generalNotes: e.target.value })}
              className={`min-h-[80px] text-caption ${notesTintClass}`}
              placeholder="Additional notes about this skeleton..."
            />
          ) : (
            <p className={`min-h-[40px] rounded border p-3 text-caption text-text-tertiary ${notesTintClass}`}>
              {skeleton.generalNotes || 'No notes'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
