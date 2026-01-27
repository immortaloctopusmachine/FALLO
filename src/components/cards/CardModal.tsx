'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, BookOpen, Layers, FileText, Trash2, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Card, TaskCard } from '@/types';
import { cn } from '@/lib/utils';

interface CardModalProps {
  card: Card | null;
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (card: Card) => void;
  onDelete: (cardId: string) => void;
}

const cardTypeConfig = {
  TASK: { label: 'Task', icon: CheckSquare, color: 'text-card-task', bg: 'bg-card-task/10' },
  USER_STORY: { label: 'User Story', icon: BookOpen, color: 'text-card-story', bg: 'bg-card-story/10' },
  EPIC: { label: 'Epic', icon: Layers, color: 'text-card-epic', bg: 'bg-card-epic/10' },
  UTILITY: { label: 'Utility', icon: FileText, color: 'text-card-utility', bg: 'bg-card-utility/10' },
};

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21];

export function CardModal({ card, boardId, isOpen, onClose, onUpdate, onDelete }: CardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [storyPoints, setStoryPoints] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset form when card changes
  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      if (card.type === 'TASK') {
        const taskData = card.taskData as { storyPoints?: number | null } | null;
        setStoryPoints(taskData?.storyPoints ?? null);
      } else {
        setStoryPoints(null);
      }
    }
  }, [card]);

  if (!card) return null;

  const config = cardTypeConfig[card.type];
  const Icon = config.icon;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
      };

      if (card.type === 'TASK') {
        updates.taskData = {
          ...(card.taskData as object || {}),
          storyPoints: storyPoints,
        };
      }

      const response = await fetch(`/api/boards/${boardId}/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        onUpdate(data.data);
      }
    } catch (error) {
      console.error('Failed to save card:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this card?')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/cards/${card.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete(card.id);
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete card:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasChanges =
    title !== card.title ||
    description !== (card.description || '') ||
    (card.type === 'TASK' && storyPoints !== ((card.taskData as { storyPoints?: number | null } | null)?.storyPoints ?? null));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[720px] gap-0 p-0">
        {/* Feature Image */}
        {card.featureImage && (
          <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
            <img
              src={card.featureImage}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Header */}
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle asChild>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-none bg-transparent px-0 text-heading font-semibold focus-visible:ring-0"
                  placeholder="Card title"
                />
              </DialogTitle>
            </div>
            <div className={cn('flex items-center gap-1.5 rounded-md px-2 py-1', config.bg)}>
              <Icon className={cn('h-4 w-4', config.color)} />
              <span className={cn('text-caption font-medium', config.color)}>
                {config.label}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex">
          {/* Main Content Area */}
          <div className="flex-1 space-y-6 p-6">
            {/* Description */}
            <div className="space-y-2">
              <Label className="text-caption font-medium text-text-secondary">
                Description
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Checklists placeholder */}
            {card.type === 'TASK' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Checklists
                </Label>
                <div className="rounded-md border border-dashed border-border p-4 text-center text-caption text-text-tertiary">
                  Checklists coming in Phase 2
                </div>
              </div>
            )}

            {/* Comments placeholder */}
            <div className="space-y-2">
              <Label className="text-caption font-medium text-text-secondary">
                Comments
              </Label>
              <div className="rounded-md border border-dashed border-border p-4 text-center text-caption text-text-tertiary">
                Comments coming in Phase 2
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-[200px] space-y-4 border-l border-border bg-background p-4">
            {/* Assignees */}
            <div className="space-y-2">
              <Label className="text-caption font-medium text-text-secondary">
                Assignees
              </Label>
              {card.type === 'TASK' && (card as TaskCard).assignees && (card as TaskCard).assignees!.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(card as TaskCard).assignees!.map((assignee) => (
                    <div key={assignee.id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={assignee.user.image || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {assignee.user.name?.[0] || assignee.user.email[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-caption">{assignee.user.name || assignee.user.email}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="w-full justify-start text-text-tertiary">
                  <User className="mr-2 h-4 w-4" />
                  Add assignee
                </Button>
              )}
            </div>

            {/* Story Points (Task only) - Fibonacci buttons */}
            {card.type === 'TASK' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Story Points
                </Label>
                <div className="flex flex-wrap gap-1">
                  {FIBONACCI_POINTS.map((points) => (
                    <Button
                      key={points}
                      variant={storyPoints === points ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-8 w-8 p-0',
                        storyPoints === points && 'bg-card-task hover:bg-card-task/90'
                      )}
                      onClick={() => setStoryPoints(storyPoints === points ? null : points)}
                    >
                      {points}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Deadline placeholder */}
            {card.type === 'TASK' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Deadline
                </Label>
                <Button variant="ghost" size="sm" className="w-full justify-start text-text-tertiary">
                  Set deadline
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-4">
              <Label className="text-caption font-medium text-text-secondary">
                Actions
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-error hover:bg-error/10 hover:text-error"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete card'}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        {hasChanges && (
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
