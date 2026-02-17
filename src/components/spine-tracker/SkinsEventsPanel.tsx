'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Skin, SpineEvent, Animation } from '@/types/spine-tracker';
import { ANIMATION_STATUSES, STATUS_COLORS } from './constants';

interface SkinsEventsPanelProps {
  targetBone: string;
  skins: Skin[];
  events: SpineEvent[];
  animations: Animation[];
  editMode: boolean;
  onUpdateTargetBone: (targetBone: string) => void;
  onAddSkin: () => void;
  onUpdateSkin: (index: number, updates: Partial<Skin>) => void;
  onDeleteSkin: (index: number) => void;
  onAddEvent: () => void;
  onUpdateEvent: (index: number, updates: Partial<SpineEvent>) => void;
  onDeleteEvent: (index: number) => void;
}

export function SkinsEventsPanel({
  targetBone,
  skins,
  events,
  animations,
  editMode,
  onUpdateTargetBone,
  onAddSkin,
  onUpdateSkin,
  onDeleteSkin,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
}: SkinsEventsPanelProps) {
  const notesTintClass = 'border-orange-500/30 bg-orange-500/10';

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-caption font-semibold text-text-primary">
            Skins ({skins.length})
          </h3>
          {editMode ? (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-caption" onClick={onAddSkin}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          ) : null}
        </div>
        <div className="space-y-1">
          {skins.map((skin, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded border border-border/50 bg-surface-hover/20 p-2"
            >
              {editMode ? (
                <>
                  <Input
                    value={skin.name}
                    onChange={(e) => onUpdateSkin(index, { name: e.target.value })}
                    className="h-7 flex-1 text-caption font-mono"
                    placeholder="skin_name"
                  />
                  <Select
                    value={skin.status}
                    onValueChange={(value) => onUpdateSkin(index, { status: value as Skin['status'] })}
                  >
                    <SelectTrigger className="h-7 w-40 text-caption">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANIMATION_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                    onClick={() => onDeleteSkin(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-mono text-caption text-text-primary">{skin.name}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-mono ${STATUS_COLORS[skin.status]?.bg || ''} ${STATUS_COLORS[skin.status]?.text || ''}`}
                  >
                    {skin.status}
                  </span>
                </>
              )}
            </div>
          ))}
          {skins.length === 0 ? (
            <p className="py-3 text-center text-caption text-text-tertiary">No skins</p>
          ) : null}
        </div>
      </div>

      <div>
        <div className="mb-2 space-y-2">
          <h3 className="text-caption font-semibold text-text-primary">
            Target Bone
          </h3>
          {editMode ? (
            <Input
              value={targetBone}
              onChange={(e) => onUpdateTargetBone(e.target.value)}
              className="h-8 text-caption font-mono"
              placeholder="bone_name"
            />
          ) : (
            <p className={`rounded border px-2 py-1.5 text-caption text-text-secondary ${notesTintClass}`}>
              {targetBone || '-'}
            </p>
          )}
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-caption font-semibold text-text-primary">
            Events ({events.length})
          </h3>
          {editMode ? (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-caption" onClick={onAddEvent}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          ) : null}
        </div>

        <div className="space-y-1">
          {events.map((eventItem, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded border border-border/50 bg-surface-hover/20 p-2"
            >
              {editMode ? (
                <>
                  <Input
                    value={eventItem.name}
                    onChange={(e) => onUpdateEvent(index, { name: e.target.value })}
                    className="h-7 flex-1 text-caption font-mono"
                    placeholder="event_name"
                  />
                  <Select
                    value={eventItem.animation || '__none__'}
                    onValueChange={(value) =>
                      onUpdateEvent(index, { animation: value === '__none__' ? '' : value })
                    }
                  >
                    <SelectTrigger className="h-7 w-40 text-caption">
                      <SelectValue placeholder="Animation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {animations.map((animation) => (
                        <SelectItem key={animation.name} value={animation.name}>
                          {animation.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={eventItem.notes}
                    onChange={(e) => onUpdateEvent(index, { notes: e.target.value })}
                    className={`h-7 w-44 text-caption ${notesTintClass}`}
                    placeholder="Comment"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                    onClick={() => onDeleteEvent(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-mono text-caption text-text-primary">{eventItem.name}</span>
                  <span className="text-caption text-text-tertiary">{eventItem.animation || '-'}</span>
                  <span className={`rounded px-2 py-0.5 text-caption text-text-tertiary ${notesTintClass}`}>
                    {eventItem.notes || '-'}
                  </span>
                </>
              )}
            </div>
          ))}
          {events.length === 0 ? (
            <p className="py-3 text-center text-caption text-text-tertiary">No events</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
