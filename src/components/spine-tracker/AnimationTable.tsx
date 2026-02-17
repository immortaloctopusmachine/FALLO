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
import type { Animation, SoundFx, SpineEvent } from '@/types/spine-tracker';
import { ANIMATION_STATUSES } from './constants';
import { SoundFxRow } from './SoundFxRow';

interface AnimationTableProps {
  animations: Animation[];
  events: SpineEvent[];
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
  events,
  editMode,
  onAdd,
  onUpdate,
  onDelete,
  onAddSoundFx,
  onUpdateSoundFx,
  onDeleteSoundFx,
}: AnimationTableProps) {
  const notesTintClass = 'border-orange-500/30 bg-orange-500/10';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-caption font-semibold text-text-primary">
          Animations ({animations.length})
        </h3>
        {editMode ? (
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-caption" onClick={onAdd}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-hover/50">
              <th className="px-3 py-1.5 text-left text-caption font-medium text-text-tertiary">Name</th>
              <th className="px-3 py-1.5 text-left text-caption font-medium text-text-tertiary">Status</th>
              <th className="px-3 py-1.5 text-left text-caption font-medium text-text-tertiary">Track</th>
              <th className="px-3 py-1.5 text-left text-caption font-medium text-text-tertiary">Events</th>
              <th className="px-3 py-1.5 text-left text-caption font-medium text-text-tertiary">Event Comment</th>
              <th className="px-3 py-1.5 text-left text-caption font-medium text-text-tertiary">Notes</th>
              {editMode ? (
                <th className="w-20 px-3 py-1.5 text-right text-caption font-medium text-text-tertiary">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {animations.map((animation, index) => {
              const linkedEvents = events.filter((eventItem) => eventItem.animation === animation.name);
              const linkedEventNames = linkedEvents.map((eventItem) => eventItem.name).join(', ');
              const linkedEventComments = linkedEvents
                .map((eventItem) => eventItem.notes)
                .filter(Boolean)
                .join(' | ');

              return (
                <Fragment key={`anim-${index}`}>
                  <tr className="border-b border-border/50 hover:bg-surface-hover/30">
                    <td className="px-3 py-1.5">
                      {editMode ? (
                        <Input
                          value={animation.name}
                          onChange={(e) => onUpdate(index, { name: e.target.value })}
                          className="h-7 text-caption font-mono"
                        />
                      ) : (
                        <span className="font-mono text-text-primary">{animation.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <Select
                        value={animation.status}
                        onValueChange={(value) => onUpdate(index, { status: value as Animation['status'] })}
                      >
                        <SelectTrigger className="h-7 min-w-[210px] text-caption">
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
                    </td>
                    <td className="px-3 py-1.5">
                      {editMode ? (
                        <Input
                          type="number"
                          min={0}
                          max={9}
                          value={animation.track}
                          onChange={(e) => onUpdate(index, { track: parseInt(e.target.value, 10) || 0 })}
                          className="h-7 w-16 text-caption"
                        />
                      ) : (
                        <span className="text-text-secondary">{animation.track}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="text-text-secondary">{linkedEventNames || '-'}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={`rounded px-2 py-0.5 text-text-tertiary ${notesTintClass}`}>
                        {linkedEventComments || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      {editMode ? (
                        <Input
                          value={animation.notes}
                          onChange={(e) => onUpdate(index, { notes: e.target.value })}
                          className={`h-7 text-caption ${notesTintClass}`}
                          placeholder="Notes"
                        />
                      ) : (
                        <span className={`rounded px-2 py-0.5 text-text-tertiary ${notesTintClass}`}>
                          {animation.notes || '-'}
                        </span>
                      )}
                    </td>
                    {editMode ? (
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-text-tertiary hover:text-text-secondary"
                            onClick={() => onAddSoundFx(index)}
                            title="Add Sound FX"
                          >
                            <Volume2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                            onClick={() => onDelete(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                  {animation.soundFx?.map((soundFx, soundFxIndex) => (
                    <SoundFxRow
                      key={`sfx-${index}-${soundFxIndex}`}
                      sfx={soundFx}
                      editMode={editMode}
                      onUpdate={(updates) => onUpdateSoundFx(index, soundFxIndex, updates)}
                      onDelete={() => onDeleteSoundFx(index, soundFxIndex)}
                    />
                  ))}
                </Fragment>
              );
            })}
            {animations.length === 0 ? (
              <tr>
                <td colSpan={editMode ? 7 : 6} className="py-4 text-center text-caption text-text-tertiary">
                  No animations
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
