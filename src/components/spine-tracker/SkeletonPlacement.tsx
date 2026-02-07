'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Skeleton, SkeletonPlacement as SkeletonPlacementType } from '@/types/spine-tracker';
import { LAYOUT_TEMPLATE_BONES } from './constants';

interface SkeletonPlacementProps {
  placement: SkeletonPlacementType;
  editMode: boolean;
  allSkeletons: Skeleton[];
  onUpdate: (updates: Partial<SkeletonPlacementType>) => void;
}

export function SkeletonPlacement({ placement, editMode, allSkeletons, onUpdate }: SkeletonPlacementProps) {
  const parentOptions = allSkeletons
    .filter((s) => s.name !== 'NEW_SKELETON')
    .map((s) => s.name);

  const showBoneDropdown = placement.parent === 'LAYOUT_TEMPLATE';

  if (!editMode) {
    return (
      <div className="space-y-2">
        <h3 className="text-caption font-semibold text-text-primary">Placement</h3>
        <div className="grid grid-cols-3 gap-3 rounded border border-border p-3 bg-surface-hover/30">
          <div>
            <span className="text-xs text-text-tertiary">Parent</span>
            <p className="text-caption text-text-primary font-mono">{placement.parent || 'standalone'}</p>
          </div>
          <div>
            <span className="text-xs text-text-tertiary">Bone</span>
            <p className="text-caption text-text-primary font-mono">{placement.bone || 'none'}</p>
          </div>
          <div>
            <span className="text-xs text-text-tertiary">Notes</span>
            <p className="text-caption text-text-tertiary">{placement.notes || '-'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-caption font-semibold text-text-primary">Placement</h3>
      <div className="grid grid-cols-3 gap-3 rounded border border-border p-3">
        <div className="space-y-1">
          <label className="text-xs text-text-tertiary">Parent Skeleton</label>
          <Select
            value={placement.parent || '__standalone__'}
            onValueChange={(v) => onUpdate({ parent: v === '__standalone__' ? null : v })}
          >
            <SelectTrigger className="h-8 text-caption">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__standalone__">Standalone</SelectItem>
              {parentOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-tertiary">Target Bone</label>
          {showBoneDropdown ? (
            <Select
              value={placement.bone || '__none__'}
              onValueChange={(v) => onUpdate({ bone: v === '__none__' ? null : v })}
            >
              <SelectTrigger className="h-8 text-caption">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {LAYOUT_TEMPLATE_BONES.map((b) => (
                  <SelectItem key={b.bone} value={b.bone}>
                    {b.bone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={placement.bone || ''}
              onChange={(e) => onUpdate({ bone: e.target.value || null })}
              className="h-8 text-caption font-mono"
              placeholder="bone_name"
            />
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-tertiary">Notes</label>
          <Input
            value={placement.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            className="h-8 text-caption"
            placeholder="Placement notes"
          />
        </div>
      </div>
    </div>
  );
}
