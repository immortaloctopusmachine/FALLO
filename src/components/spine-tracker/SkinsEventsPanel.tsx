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
import type { Skin } from '@/types/spine-tracker';
import { ANIMATION_STATUSES, STATUS_COLORS } from './constants';

interface SkinsEventsPanelProps {
  skins: Skin[];
  editMode: boolean;
  onAddSkin: () => void;
  onUpdateSkin: (index: number, updates: Partial<Skin>) => void;
  onDeleteSkin: (index: number) => void;
}

export function SkinsEventsPanel({
  skins,
  editMode,
  onAddSkin,
  onUpdateSkin,
  onDeleteSkin,
}: SkinsEventsPanelProps) {
  return (
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
                  <SelectTrigger className={`h-6 text-[11px] font-mono border-0 rounded px-2 py-0.5 ${STATUS_COLORS[skin.status]?.bg || ''} ${STATUS_COLORS[skin.status]?.text || ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANIMATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className="flex items-center gap-1.5">
                          <span className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[s]?.bg || ''}`} />
                          {s}
                        </span>
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
  );
}
