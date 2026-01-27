'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, BookOpen, Layers, FileText, Trash2, Image, X } from 'lucide-react';
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
import { ChecklistSection } from './ChecklistSection';
import { CommentsSection } from './CommentsSection';
import { AssigneePicker } from './AssigneePicker';
import { DeadlinePicker } from './DeadlinePicker';
import { ColorPicker } from './ColorPicker';
import type { Card, TaskCard, Checklist, CardAssignee } from '@/types';
import { cn } from '@/lib/utils';

interface CardModalProps {
  card: Card | null;
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (card: Card) => void;
  onDelete: (cardId: string) => void;
  currentUserId?: string;
}

const cardTypeConfig = {
  TASK: { label: 'Task', icon: CheckSquare, color: 'text-card-task', bg: 'bg-card-task/10' },
  USER_STORY: { label: 'User Story', icon: BookOpen, color: 'text-card-story', bg: 'bg-card-story/10' },
  EPIC: { label: 'Epic', icon: Layers, color: 'text-card-epic', bg: 'bg-card-epic/10' },
  UTILITY: { label: 'Utility', icon: FileText, color: 'text-card-utility', bg: 'bg-card-utility/10' },
};

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21];

export function CardModal({ card, boardId, isOpen, onClose, onUpdate, onDelete, currentUserId }: CardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [storyPoints, setStoryPoints] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [featureImage, setFeatureImage] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [assignees, setAssignees] = useState<CardAssignee[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset form when card changes
  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setColor(card.color);
      setFeatureImage(card.featureImage);

      if (card.type === 'TASK') {
        const taskCard = card as TaskCard;
        setStoryPoints(taskCard.taskData?.storyPoints ?? null);
        setDeadline(taskCard.taskData?.deadline ?? null);
        setChecklists(taskCard.checklists || []);
        setAssignees(taskCard.assignees || []);
      } else {
        setStoryPoints(null);
        setDeadline(null);
        setChecklists([]);
        setAssignees([]);
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
        color,
        featureImage,
      };

      if (card.type === 'TASK') {
        updates.taskData = {
          ...(card.taskData as object || {}),
          storyPoints,
          deadline,
        };
      }

      const response = await fetch(`/api/boards/${boardId}/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        // Merge updated card with local state for checklists and assignees
        const updatedCard = {
          ...data.data,
          checklists,
          assignees,
        };
        onUpdate(updatedCard);
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

  const handleChecklistsUpdate = (updatedChecklists: Checklist[]) => {
    setChecklists(updatedChecklists);
    // Also update the parent card
    onUpdate({
      ...card,
      checklists: updatedChecklists,
    } as Card);
  };

  const handleAssigneesUpdate = (updatedAssignees: CardAssignee[]) => {
    setAssignees(updatedAssignees);
    // Also update the parent card
    onUpdate({
      ...card,
      assignees: updatedAssignees,
    } as Card);
  };

  const hasChanges =
    title !== card.title ||
    description !== (card.description || '') ||
    color !== card.color ||
    featureImage !== card.featureImage ||
    (card.type === 'TASK' && (
      storyPoints !== ((card as TaskCard).taskData?.storyPoints ?? null) ||
      deadline !== ((card as TaskCard).taskData?.deadline ?? null)
    ));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[800px] gap-0 overflow-hidden p-0">
        {/* Feature Image */}
        {featureImage && (
          <div className="relative h-40 w-full overflow-hidden bg-surface-hover">
            <img
              src={featureImage}
              alt=""
              className="h-full w-full object-cover"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => setFeatureImage(null)}
            >
              <X className="mr-1 h-4 w-4" />
              Remove
            </Button>
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
        <div className="flex max-h-[calc(90vh-180px)] overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
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

            {/* Todo Checklist */}
            {card.type === 'TASK' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Todo Checklist
                </Label>
                <ChecklistSection
                  checklists={checklists}
                  boardId={boardId}
                  cardId={card.id}
                  type="todo"
                  onUpdate={handleChecklistsUpdate}
                />
              </div>
            )}

            {/* Feedback Checklist */}
            {card.type === 'TASK' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Feedback
                </Label>
                <ChecklistSection
                  checklists={checklists}
                  boardId={boardId}
                  cardId={card.id}
                  type="feedback"
                  onUpdate={handleChecklistsUpdate}
                />
              </div>
            )}

            {/* Comments */}
            <div className="space-y-2">
              <Label className="text-caption font-medium text-text-secondary">
                Comments
              </Label>
              <CommentsSection
                boardId={boardId}
                cardId={card.id}
                currentUserId={currentUserId}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-[220px] space-y-4 border-l border-border bg-background overflow-y-auto p-4">
            {/* Assignees */}
            {card.type === 'TASK' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Assignees
                </Label>
                <AssigneePicker
                  assignees={assignees}
                  boardId={boardId}
                  cardId={card.id}
                  onUpdate={handleAssigneesUpdate}
                />
              </div>
            )}

            {/* Story Points (Task only) */}
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

            {/* Deadline */}
            {card.type === 'TASK' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Deadline
                </Label>
                <DeadlinePicker
                  deadline={deadline}
                  onChange={setDeadline}
                />
              </div>
            )}

            {/* Color */}
            <div className="space-y-2">
              <Label className="text-caption font-medium text-text-secondary">
                Color
              </Label>
              <ColorPicker color={color} onChange={setColor} />
            </div>

            {/* Feature Image URL */}
            <div className="space-y-2">
              <Label className="text-caption font-medium text-text-secondary">
                Feature Image
              </Label>
              {!featureImage ? (
                <Input
                  placeholder="Image URL..."
                  onBlur={(e) => {
                    if (e.target.value.trim()) {
                      setFeatureImage(e.target.value.trim());
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = e.currentTarget.value.trim();
                      if (value) {
                        setFeatureImage(value);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-text-tertiary"
                  onClick={() => setFeatureImage(null)}
                >
                  <Image className="mr-2 h-4 w-4" />
                  Change image
                </Button>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-border">
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
