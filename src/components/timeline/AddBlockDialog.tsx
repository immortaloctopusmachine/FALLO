'use client';

import { useState, useCallback } from 'react';
import { Calendar, Plus, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { snapToMonday, getBlockEndDate } from '@/lib/list-templates';
import type { BlockType } from '@/types';

interface List {
  id: string;
  name: string;
  phase: string | null;
}

interface AddBlockDialogProps {
  boardId: string;
  blockTypes: BlockType[];
  lists: List[];
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    blockTypeId: string;
    startDate: string;
    endDate: string;
    listId?: string;
    createList?: boolean;
  }) => Promise<void>;
  defaultStartDate?: Date;
}

export function AddBlockDialog({
  boardId: _boardId,
  blockTypes,
  lists,
  isOpen,
  onClose,
  onCreate,
  defaultStartDate,
}: AddBlockDialogProps) {
  const [selectedBlockTypeId, setSelectedBlockTypeId] = useState(blockTypes[0]?.id || '');
  const [startDate, setStartDate] = useState(() => {
    // Snap to Monday for consistent week alignment
    const baseDate = defaultStartDate ? new Date(defaultStartDate) : new Date();
    const monday = snapToMonday(baseDate);
    return monday.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    // Default to 5-day block (Mon-Fri)
    const baseDate = defaultStartDate ? new Date(defaultStartDate) : new Date();
    const monday = snapToMonday(baseDate);
    const friday = getBlockEndDate(monday);
    return friday.toISOString().split('T')[0];
  });
  const [linkOption, setLinkOption] = useState<'none' | 'existing' | 'create'>('create');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      onClose();
    } else {
      setSelectedBlockTypeId(blockTypes[0]?.id || '');
      setLinkOption('create');
      setSelectedListId('');
      setError(null);
    }
  }, [onClose, blockTypes]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBlockTypeId) {
      setError('Please select a block type');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please set start and end dates');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be after start date');
      return;
    }

    if (linkOption === 'existing' && !selectedListId) {
      setError('Please select a list to link');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onCreate({
        blockTypeId: selectedBlockTypeId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        listId: linkOption === 'existing' ? selectedListId : undefined,
        createList: linkOption === 'create',
      });
      onClose();
    } catch (err) {
      setError('Failed to create block. Please try again.');
      console.error('Failed to create block:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBlockTypeId, startDate, endDate, linkOption, selectedListId, onCreate, onClose]);

  const selectedBlockType = blockTypes.find(bt => bt.id === selectedBlockTypeId);

  // Filter lists that are not already linked to a block
  const availableLists = lists.filter(_list => {
    // This is a simplified check - in reality, we'd need to track which lists are already linked
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Timeline Block</DialogTitle>
          <DialogDescription>
            Create a new timeline block. You can optionally link it to a planning list.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Block Type Selection */}
          <div className="space-y-2">
            <Label>Block Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {blockTypes.map((bt) => (
                <button
                  key={bt.id}
                  type="button"
                  onClick={() => setSelectedBlockTypeId(bt.id)}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md border text-left transition-colors',
                    selectedBlockTypeId === bt.id
                      ? 'border-success bg-success/10'
                      : 'border-border hover:border-success/50'
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: bt.color }}
                  />
                  <span className="text-body truncate">{bt.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date (snaps to Monday)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    // Snap selected date to Monday
                    const selectedDate = new Date(e.target.value);
                    const monday = snapToMonday(selectedDate);
                    const mondayStr = monday.toISOString().split('T')[0];
                    setStartDate(mondayStr);
                    // Auto-update end date to Friday (5-day block)
                    const friday = getBlockEndDate(monday);
                    setEndDate(friday.toISOString().split('T')[0]);
                  }}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Planning List Link Options */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Planning List
            </Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-surface-hover">
                <input
                  type="radio"
                  name="linkOption"
                  value="create"
                  checked={linkOption === 'create'}
                  onChange={() => setLinkOption('create')}
                  className="rounded-full"
                />
                <div>
                  <span className="text-body">Create new planning list</span>
                  <p className="text-caption text-text-tertiary">
                    A new &quot;{selectedBlockType?.name || 'Block'}&quot; list will be created with matching dates
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-surface-hover">
                <input
                  type="radio"
                  name="linkOption"
                  value="existing"
                  checked={linkOption === 'existing'}
                  onChange={() => setLinkOption('existing')}
                  className="rounded-full"
                />
                <div className="flex-1">
                  <span className="text-body">Link to existing list</span>
                  {linkOption === 'existing' && (
                    <select
                      value={selectedListId}
                      onChange={(e) => setSelectedListId(e.target.value)}
                      className="mt-2 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-body shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">Select a list...</option>
                      {availableLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-surface-hover">
                <input
                  type="radio"
                  name="linkOption"
                  value="none"
                  checked={linkOption === 'none'}
                  onChange={() => setLinkOption('none')}
                  className="rounded-full"
                />
                <div>
                  <span className="text-body">No linked list</span>
                  <p className="text-caption text-text-tertiary">
                    Block will only appear on timeline
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-caption text-error">{error}</div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                'Creating...'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Block
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
