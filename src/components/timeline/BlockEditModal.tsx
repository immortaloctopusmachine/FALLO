'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Trash2, Link2, Users } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { TimelineBlock, BlockType } from '@/types';

interface List {
  id: string;
  name: string;
  phase: string | null;
}

interface SimpleUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface BlockEditModalProps {
  block: TimelineBlock | null;
  boardId: string;
  blockTypes: BlockType[];
  lists: List[];
  users: SimpleUser[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (blockId: string, updates: {
    startDate?: string;
    endDate?: string;
    blockTypeId?: string;
    listId?: string | null;
    syncToList?: boolean;
  }) => Promise<void>;
  onDelete: (blockId: string) => Promise<void>;
}

export function BlockEditModal({
  block,
  boardId: _boardId,
  blockTypes,
  lists,
  users: _users,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: BlockEditModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBlockTypeId, setSelectedBlockTypeId] = useState('');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [syncToList, setSyncToList] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Populate form when block changes
  useEffect(() => {
    if (block) {
      setStartDate(new Date(block.startDate).toISOString().split('T')[0]);
      setEndDate(new Date(block.endDate).toISOString().split('T')[0]);
      setSelectedBlockTypeId(block.blockType.id);
      setSelectedListId(block.list?.id || null);
    }
  }, [block]);

  const handleSave = useCallback(async () => {
    if (!block) return;

    setIsLoading(true);
    try {
      // Dates are not editable - only block type and list link can be changed
      await onSave(block.id, {
        blockTypeId: selectedBlockTypeId,
        listId: selectedListId,
        syncToList,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save block:', error);
    } finally {
      setIsLoading(false);
    }
  }, [block, selectedBlockTypeId, selectedListId, syncToList, onSave, onClose]);

  const handleDelete = useCallback(async () => {
    if (!block) return;

    setIsLoading(true);
    try {
      await onDelete(block.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete block:', error);
    } finally {
      setIsLoading(false);
    }
  }, [block, onDelete, onClose]);

  if (!block) return null;

  const selectedBlockType = blockTypes.find(bt => bt.id === selectedBlockTypeId);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedBlockType?.color || '#6366f1' }}
              />
              Edit Timeline Block
            </DialogTitle>
            <DialogDescription>
              Modify block dates, type, and linked planning list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Block Type */}
            <div className="space-y-2">
              <Label>Block Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {blockTypes.map((bt) => (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => setSelectedBlockTypeId(bt.id)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-md border-2 text-left transition-colors',
                      selectedBlockTypeId === bt.id
                        ? 'border-success bg-success/10'
                        : 'border-border hover:border-success/50'
                    )}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: bt.color }}
                    />
                    <span className={cn(
                      'text-body truncate',
                      selectedBlockTypeId === bt.id && 'text-success font-medium'
                    )}>{bt.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range - Read Only */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule (drag blocks to change)
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-md border border-border bg-surface-subtle">
                  <div className="text-caption text-text-tertiary">Start</div>
                  <div className="text-body font-medium">
                    {startDate ? new Date(startDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : '-'}
                  </div>
                </div>
                <div className="p-3 rounded-md border border-border bg-surface-subtle">
                  <div className="text-caption text-text-tertiary">End</div>
                  <div className="text-body font-medium">
                    {endDate ? new Date(endDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : '-'}
                  </div>
                </div>
              </div>
              <p className="text-caption text-text-tertiary">
                Blocks are scheduled in 5-day weeks (Mon-Fri). Use drag-and-drop on the timeline to move blocks.
              </p>
            </div>

            {/* Linked List */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Linked Planning List
              </Label>
              {block.list ? (
                <div className="p-3 rounded-md border border-success/50 bg-success/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-body font-medium">{block.list.name}</span>
                  </div>
                  {block.list.phase && (
                    <div className="text-caption text-text-secondary mt-1">
                      Phase: {block.list.phase.replace(/_/g, ' ')}
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-caption text-text-secondary mt-2">
                    <input
                      type="checkbox"
                      checked={syncToList}
                      onChange={(e) => setSyncToList(e.target.checked)}
                      className="rounded border-input"
                    />
                    Update list dates when saving
                  </label>
                </div>
              ) : (
                <div className="p-3 rounded-md border border-border bg-surface-subtle text-text-tertiary text-body">
                  No linked planning list
                </div>
              )}
            </div>

            {/* Assignments Summary */}
            {block.assignments.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assignments ({block.assignments.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {block.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-1 px-2 py-1 bg-surface-active rounded-full text-caption"
                    >
                      <span>{assignment.user.name || assignment.user.email}</span>
                      <span className="text-text-tertiary">({assignment.dedication}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-border mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-error hover:text-error hover:bg-error/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timeline Block?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the timeline block &quot;{block.blockType.name}
              {block.position > 1 && ` ${block.position}`}&quot;. This action cannot be undone.
              {block.list && (
                <span className="block mt-2 text-warning">
                  Note: The linked planning list &quot;{block.list.name}&quot; will not be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-error hover:bg-error/90"
            >
              {isLoading ? 'Deleting...' : 'Delete Block'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
