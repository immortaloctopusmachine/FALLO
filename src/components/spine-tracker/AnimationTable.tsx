'use client';

import { Fragment } from 'react';
import { Plus, Trash2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Animation, SoundFx } from '@/types/spine-tracker';
import { ANIMATION_STATUSES, STATUS_COLORS } from './constants';
import { SoundFxRow } from './SoundFxRow';

interface AnimationTableProps {
  animations: Animation[];
  editMode: boolean;
  onAdd: () => void;
  onUpdate: (index: number, updates: Partial<Animation>) => void;
  onDelete: (index: number) => void;
  onAddSoundFx: (animIndex: number) => void;
  onUpdateSoundFx: (animIndex: number, sfxIndex: number, updates: Partial<SoundFx>) => void;
  onDeleteSoundFx: (animIndex: number, sfxIndex: number) => void;
}

export function AnimationTable({
  animations,
  editMode,
  onAdd,
  onUpdate,
  onDelete,
  onAddSoundFx,
  onUpdateSoundFx,
  onDeleteSoundFx,
}: AnimationTableProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-caption font-semibold text-text-primary">
          Animations ({animations.length})
        </h3>
        {editMode && (
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-caption" onClick={onAdd}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-hover/50">
              <th className="py-1.5 px-3 text-left text-caption font-medium text-text-tertiary">Name</th>
              <th className="py-1.5 px-3 text-left text-caption font-medium text-text-tertiary">Status</th>
              <th className="py-1.5 px-3 text-left text-caption font-medium text-text-tertiary">Track</th>
              <th className="py-1.5 px-3 text-left text-caption font-medium text-text-tertiary">Notes</th>
              {editMode && (
                <th className="py-1.5 px-3 text-right text-caption font-medium text-text-tertiary w-20">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {animations.map((anim, i) => (
              <Fragment key={`anim-${i}`}>
                <tr className="border-b border-border/50 hover:bg-surface-hover/30">
                  <td className="py-1.5 px-3">
                    {editMode ? (
                      <Input
                        value={anim.name}
                        onChange={(e) => onUpdate(i, { name: e.target.value })}
                        className="h-7 text-caption font-mono"
                      />
                    ) : (
                      <span className="font-mono text-text-primary">{anim.name}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-3">
                    {editMode ? (
                      <Select
                        value={anim.status}
                        onValueChange={(v) => onUpdate(i, { status: v as Animation['status'] })}
                      >
                        <SelectTrigger className="h-7 text-caption">
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
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-mono ${STATUS_COLORS[anim.status]?.bg || ''} ${STATUS_COLORS[anim.status]?.text || ''}`}
                      >
                        {anim.status}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-3">
                    {editMode ? (
                      <Input
                        type="number"
                        min={0}
                        max={9}
                        value={anim.track}
                        onChange={(e) => onUpdate(i, { track: parseInt(e.target.value) || 0 })}
                        className="h-7 w-16 text-caption"
                      />
                    ) : (
                      <span className="text-text-secondary">{anim.track}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-3">
                    {editMode ? (
                      <Input
                        value={anim.notes}
                        onChange={(e) => onUpdate(i, { notes: e.target.value })}
                        className="h-7 text-caption"
                        placeholder="Notes"
                      />
                    ) : (
                      <span className="text-text-tertiary">{anim.notes || '-'}</span>
                    )}
                  </td>
                  {editMode && (
                    <td className="py-1.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-text-tertiary hover:text-text-secondary"
                          onClick={() => onAddSoundFx(i)}
                          title="Add Sound FX"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                          onClick={() => onDelete(i)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
                {/* Sound FX sub-rows */}
                {anim.soundFx?.map((sfx, j) => (
                  <SoundFxRow
                    key={`sfx-${i}-${j}`}
                    sfx={sfx}
                    editMode={editMode}
                    onUpdate={(updates) => onUpdateSoundFx(i, j, updates)}
                    onDelete={() => onDeleteSoundFx(i, j)}
                  />
                ))}
              </Fragment>
            ))}
            {animations.length === 0 && (
              <tr>
                <td colSpan={editMode ? 5 : 4} className="py-4 text-center text-caption text-text-tertiary">
                  No animations
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
