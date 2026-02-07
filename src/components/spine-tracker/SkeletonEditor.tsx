'use client';

import { Edit2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Skeleton, Animation, SoundFx, Skin, SpineEvent } from '@/types/spine-tracker';
import { SKELETON_STATUSES, STATUS_COLORS, DEFAULT_SKELETON_GROUPS, getZOrderColor } from './constants';
import { AnimationTable } from './AnimationTable';
import { SkeletonPlacement } from './SkeletonPlacement';
import { SkinsEventsPanel } from './SkinsEventsPanel';

interface SkeletonEditorProps {
  skeleton: Skeleton;
  allSkeletons: Skeleton[];
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
  const statusColor = STATUS_COLORS[skeleton.status];
  const zColor = getZOrderColor(skeleton.zOrder);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-surface shrink-0">
        <div className="flex items-center gap-2">
          {skeleton.isLayoutTemplate && (
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-600 text-amber-100">
              MASTER
            </span>
          )}
          <span className={`px-2 py-0.5 rounded text-xs font-mono text-white ${zColor}`}>
            z:{skeleton.zOrder}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-mono ${statusColor?.bg || ''} ${statusColor?.text || ''}`}>
            {skeleton.status}
          </span>
        </div>
        <div>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Name + Description + Group + Z-Order + Status */}
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
                    className="h-8 text-caption"
                    placeholder="Brief description"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-text-tertiary">Group</label>
                  <Select value={skeleton.group} onValueChange={(v) => onUpdate({ group: v })}>
                    <SelectTrigger className="h-8 text-caption">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_SKELETON_GROUPS.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.icon} {g.label}
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
                    onChange={(e) => onUpdate({ zOrder: parseInt(e.target.value) || 0 })}
                    className="h-8 text-caption"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-tertiary">Status</label>
                  <Select
                    value={skeleton.status}
                    onValueChange={(v) => onUpdate({ status: v as Skeleton['status'] })}
                  >
                    <SelectTrigger className="h-8 text-caption">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SKELETON_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold font-mono text-text-primary">{skeleton.name}</h2>
              {skeleton.description && (
                <p className="text-caption text-text-secondary">{skeleton.description}</p>
              )}
            </>
          )}
        </div>

        {/* Placement */}
        <SkeletonPlacement
          placement={skeleton.placement}
          editMode={editMode}
          allSkeletons={allSkeletons}
          onUpdate={(updates) =>
            onUpdate({ placement: { ...skeleton.placement, ...updates } })
          }
        />

        {/* Animations */}
        <AnimationTable
          animations={skeleton.animations}
          editMode={editMode}
          onAdd={onAddAnimation}
          onUpdate={onUpdateAnimation}
          onDelete={onDeleteAnimation}
          onAddSoundFx={onAddSoundFx}
          onUpdateSoundFx={onUpdateSoundFx}
          onDeleteSoundFx={onDeleteSoundFx}
        />

        {/* Skins + Events */}
        <SkinsEventsPanel
          skins={skeleton.skins}
          events={skeleton.events}
          animations={skeleton.animations}
          editMode={editMode}
          onAddSkin={onAddSkin}
          onUpdateSkin={onUpdateSkin}
          onDeleteSkin={onDeleteSkin}
          onAddEvent={onAddEvent}
          onUpdateEvent={onUpdateEvent}
          onDeleteEvent={onDeleteEvent}
        />

        {/* General Notes */}
        <div className="space-y-2">
          <h3 className="text-caption font-semibold text-text-primary">General Notes</h3>
          {editMode ? (
            <Textarea
              value={skeleton.generalNotes}
              onChange={(e) => onUpdate({ generalNotes: e.target.value })}
              className="text-caption min-h-[80px]"
              placeholder="Additional notes about this skeleton..."
            />
          ) : (
            <p className="text-caption text-text-tertiary rounded border border-border/50 p-3 bg-surface-hover/20 min-h-[40px]">
              {skeleton.generalNotes || 'No notes'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
