'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SoundFx } from '@/types/spine-tracker';
import { SOUND_FX_TRIGGERS } from './constants';

interface SoundFxRowProps {
  sfx: SoundFx;
  editMode: boolean;
  onUpdate: (updates: Partial<SoundFx>) => void;
  onDelete: () => void;
}

export function SoundFxRow({ sfx, editMode, onUpdate, onDelete }: SoundFxRowProps) {
  if (!editMode) {
    return (
      <tr className="border-t border-border/50 bg-surface-hover/30">
        <td className="py-1 pl-8 pr-2 text-caption text-text-tertiary" colSpan={1}>
          SFX
        </td>
        <td className="py-1 px-2 text-caption font-mono text-text-secondary">{sfx.file}</td>
        <td className="py-1 px-2 text-caption text-text-secondary">{sfx.trigger}</td>
        <td className="py-1 px-2 text-caption text-text-secondary">{sfx.volume}</td>
        <td className="py-1 px-2 text-caption text-text-tertiary">
          <span className="rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5">
            {sfx.notes || '-'}
          </span>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-border/50 bg-surface-hover/30">
      <td className="py-1 pl-8 pr-2 text-caption text-text-tertiary">SFX</td>
      <td className="py-1 px-2">
        <Input
          value={sfx.file}
          onChange={(e) => onUpdate({ file: e.target.value })}
          className="h-7 text-caption"
          placeholder="filename.mp3"
        />
      </td>
      <td className="py-1 px-2">
        <Select value={sfx.trigger} onValueChange={(v) => onUpdate({ trigger: v as SoundFx['trigger'] })}>
          <SelectTrigger className="h-7 text-caption">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOUND_FX_TRIGGERS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-1 px-2">
        <Input
          type="number"
          min={0}
          max={1}
          step={0.1}
          value={sfx.volume}
          onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) || 0 })}
          className="h-7 w-16 text-caption"
        />
      </td>
      <td className="py-1 px-2">
        <div className="flex items-center gap-1">
          <Input
            value={sfx.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            className="h-7 text-caption border-orange-500/30 bg-orange-500/10"
            placeholder="Notes"
          />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
