'use client';

import { useState, useMemo } from 'react';
import { Copy, Loader2, ArrowRight, Info } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api-client';
import { generateVersionedTitle } from '@/lib/task-presets';
import type { Card, TaskCard, BoardMember, List } from '@/types';

interface CopyCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  card: TaskCard;
  boardId: string;
  taskLists: List[];
  boardMembers: BoardMember[];
  onCardCopied: (newCard: Card) => void;
}

export function CopyCardDialog({
  isOpen,
  onClose,
  card,
  boardId,
  taskLists,
  boardMembers,
  onCardCopied,
}: CopyCardDialogProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);

  // Filter to "To Do" style lists by name, fallback to all taskLists
  const targetLists = useMemo(() => {
    const name = (n: string) => n.toLowerCase();
    const todoLists = taskLists.filter((l) => {
      const n = name(l.name);
      return n.includes('to do') || n.includes('todo') || n.includes('backlog');
    });
    return todoLists.length > 0 ? todoLists : taskLists;
  }, [taskLists]);

  const [listId, setListId] = useState<string>(() => targetLists[0]?.id || '');

  const versionedTitle = useMemo(
    () => generateVersionedTitle(card.title),
    [card.title]
  );

  const hasChain = !!(
    card.taskData?.dependsOnTaskId ||
    card.taskData?.versionOfCardId
  );

  const handleCopy = async () => {
    if (!listId) {
      toast.error('Please select a target list');
      return;
    }

    setIsLoading(true);
    try {
      const newCard = await apiFetch<Card>(
        `/api/boards/${boardId}/cards/${card.id}/copy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listId,
            assigneeId: assigneeId || null,
          }),
        }
      );

      // Update UI immediately; reconcile in background.
      onCardCopied(newCard);
      toast.success('Card copied successfully');
      onClose();
      void queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
    } catch (error) {
      console.error('Failed to copy card:', error);
      toast.error('Failed to copy card');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    } else {
      setAssigneeId(null);
      setListId(targetLists[0]?.id || '');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Copy Task Card
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Title preview */}
          <div className="space-y-1.5">
            <p className="text-caption font-medium text-text-secondary">
              Title
            </p>
            <div className="flex items-center gap-2 text-body">
              <span className="truncate text-text-tertiary line-through">
                {card.title}
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
              <span className="truncate font-medium text-text-primary">
                {versionedTitle}
              </span>
            </div>
          </div>

          {/* Chain info */}
          {hasChain && (
            <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-2.5 dark:border-blue-800 dark:bg-blue-950/30">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
              <p className="text-caption text-blue-700 dark:text-blue-300">
                The copy will be linked as a version of this card in the
                connected task map.
              </p>
            </div>
          )}

          {/* Target list */}
          <div className="space-y-1.5">
            <p className="text-caption font-medium text-text-secondary">
              Place in list
            </p>
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a list" />
              </SelectTrigger>
              <SelectContent>
                {targetLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee (optional) */}
          <div className="space-y-1.5">
            <p className="text-caption font-medium text-text-secondary">
              Assign to{' '}
              <span className="text-text-tertiary font-normal">(optional)</span>
            </p>
            <Select
              value={assigneeId || '_none'}
              onValueChange={(v) => setAssigneeId(v === '_none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No assignee</SelectItem>
                {boardMembers.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage
                          src={member.user.image || undefined}
                        />
                        <AvatarFallback className="text-[10px]">
                          {member.user.name?.[0] || member.user.email[0]}
                        </AvatarFallback>
                      </Avatar>
                      {member.user.name || member.user.email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleCopy} disabled={isLoading || !listId}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Copying...
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
