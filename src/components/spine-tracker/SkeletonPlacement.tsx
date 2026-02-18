'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Skeleton, SkeletonPlacement as SkeletonPlacementType } from '@/types/spine-tracker';
import { LAYOUT_TEMPLATE_BONES } from './constants';

interface SkeletonPlacementProps {
  placement: SkeletonPlacementType;
  editMode: boolean;
  allSkeletons: Skeleton[];
  onUpdate: (updates: Partial<SkeletonPlacementType>) => void;
}

export function SkeletonPlacement({ placement, editMode, allSkeletons, onUpdate }: SkeletonPlacementProps) {
  const [parentOpen, setParentOpen] = useState(false);
  const [boneOpen, setBoneOpen] = useState(false);

  const parentOptions = allSkeletons
    .filter((s) => s.name !== 'NEW_SKELETON')
    .map((s) => s.name);

  const showBoneDropdown = placement.parent === 'LAYOUT_TEMPLATE';
  const hasPlacementData = Boolean(
    placement.parent ||
    placement.bone ||
    (placement.notes && placement.notes.trim().length > 0)
  );

  if (!editMode) {
    if (!hasPlacementData) {
      return null;
    }

    return (
      <div className="space-y-2">
        <h3 className="text-caption font-semibold text-text-primary">Placement</h3>
        <div className="grid grid-cols-3 gap-3 rounded border border-border p-3 bg-surface-hover/30">
          <div>
            <span className="text-xs text-text-tertiary">Skeleton</span>
            <p className="text-caption text-text-primary font-mono">{placement.parent || '-'}</p>
          </div>
          <div>
            <span className="text-xs text-text-tertiary">Bone</span>
            <p className="text-caption text-text-primary font-mono">{placement.bone || '-'}</p>
          </div>
          <div>
            <span className="text-xs text-text-tertiary">Notes</span>
            <p className="text-caption text-text-tertiary rounded border border-orange-500/30 bg-orange-500/10 px-2 py-1">
              {placement.notes || '-'}
            </p>
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
          <label className="text-xs text-text-tertiary">Skeleton</label>
          <Popover open={parentOpen} onOpenChange={setParentOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-caption',
                  'hover:bg-accent hover:text-accent-foreground',
                  !placement.parent && 'text-muted-foreground'
                )}
              >
                <span className="truncate font-mono">
                  {placement.parent || 'Standalone'}
                </span>
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search skeletons..." />
                <CommandList>
                  <CommandEmpty>No skeletons found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="Standalone"
                      onSelect={() => {
                        onUpdate({ parent: null });
                        setParentOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-3.5 w-3.5', !placement.parent ? 'opacity-100' : 'opacity-0')} />
                      Standalone
                    </CommandItem>
                    {parentOptions.map((name) => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={() => {
                          onUpdate({ parent: name });
                          setParentOpen(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-3.5 w-3.5', placement.parent === name ? 'opacity-100' : 'opacity-0')} />
                        <span className="font-mono">{name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-tertiary">Target Bone</label>
          {showBoneDropdown ? (
            <Popover open={boneOpen} onOpenChange={setBoneOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    'flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-caption',
                    'hover:bg-accent hover:text-accent-foreground',
                    !placement.bone && 'text-muted-foreground'
                  )}
                >
                  <span className="truncate font-mono">
                    {placement.bone || 'None'}
                  </span>
                  <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search bones..." />
                  <CommandList>
                    <CommandEmpty>No bones found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="None"
                        onSelect={() => {
                          onUpdate({ bone: null });
                          setBoneOpen(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-3.5 w-3.5', !placement.bone ? 'opacity-100' : 'opacity-0')} />
                        None
                      </CommandItem>
                      {LAYOUT_TEMPLATE_BONES.map((b) => (
                        <CommandItem
                          key={b.bone}
                          value={b.bone}
                          onSelect={() => {
                            onUpdate({ bone: b.bone });
                            setBoneOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-3.5 w-3.5', placement.bone === b.bone ? 'opacity-100' : 'opacity-0')} />
                          <span className="font-mono">{b.bone}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
            className="h-8 text-caption border-orange-500/30 bg-orange-500/10"
            placeholder="Placement notes"
          />
        </div>
      </div>
    </div>
  );
}
