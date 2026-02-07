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
  skins: Skin[];
  events: SpineEvent[];
  animations: Animation[];
  editMode: boolean;
  onAddSkin: () => void;
  onUpdateSkin: (index: number, updates: Partial<Skin>) => void;
  onDeleteSkin: (index: number) => void;
  onAddEvent: () => void;
  onUpdateEvent: (index: number, updates: Partial<SpineEvent>) => void;
  onDeleteEvent: (index: number) => void;
}

export function SkinsEventsPanel({
  skins,
  events,
  animations,
  editMode,
  onAddSkin,
  onUpdateSkin,
  onDeleteSkin,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
}: SkinsEventsPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Skins */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-caption font-semibold text-text-primary">
            Skins ({skins.length})
          </h3>
          {editMode && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-caption" onClick={onAddSkin}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          )}
        </div>
        <div className="space-y-1">
          {skins.map((skin, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded border border-border/50 p-2 bg-surface-hover/20"
            >
              {editMode ? (
                <>
                  <Input
                    value={skin.name}
                    onChange={(e) => onUpdateSkin(i, { name: e.target.value })}
                    className="h-7 text-caption font-mono flex-1"
                    placeholder="skin_name"
                  />
                  <Select
                    value={skin.status}
                    onValueChange={(v) => onUpdateSkin(i, { status: v as Skin['status'] })}
                  >
                    <SelectTrigger className="h-7 text-caption w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANIMATION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                    onClick={() => onDeleteSkin(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="font-mono text-caption text-text-primary flex-1">{skin.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono ${STATUS_COLORS[skin.status]?.bg || ''} ${STATUS_COLORS[skin.status]?.text || ''}`}
                  >
                    {skin.status}
                  </span>
                </>
              )}
            </div>
          ))}
          {skins.length === 0 && (
            <p className="text-caption text-text-tertiary text-center py-3">No skins</p>
          )}
        </div>
      </div>

      {/* Events */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-caption font-semibold text-text-primary">
            Events ({events.length})
          </h3>
          {editMode && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-caption" onClick={onAddEvent}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          )}
        </div>
        <div className="space-y-1">
          {events.map((evt, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded border border-border/50 p-2 bg-surface-hover/20"
            >
              {editMode ? (
                <>
                  <Input
                    value={evt.name}
                    onChange={(e) => onUpdateEvent(i, { name: e.target.value })}
                    className="h-7 text-caption font-mono flex-1"
                    placeholder="event_name"
                  />
                  <Select
                    value={evt.animation || '__none__'}
                    onValueChange={(v) => onUpdateEvent(i, { animation: v === '__none__' ? '' : v })}
                  >
                    <SelectTrigger className="h-7 text-caption w-32">
                      <SelectValue placeholder="Animation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {animations.map((a) => (
                        <SelectItem key={a.name} value={a.name}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                    onClick={() => onDeleteEvent(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="font-mono text-caption text-text-primary flex-1">{evt.name}</span>
                  <span className="text-caption text-text-tertiary">
                    {evt.animation || '-'}
                  </span>
                </>
              )}
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-caption text-text-tertiary text-center py-3">No events</p>
          )}
        </div>
      </div>
    </div>
  );
}
