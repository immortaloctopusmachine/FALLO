'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import type { Checklist, ChecklistItem } from '@/types';
import { cn } from '@/lib/utils';

interface SimpleChecklistProps {
  boardId: string;
  cardId: string;
  type: 'todo' | 'feedback';
  checklists: Checklist[];
  onUpdate: (checklists: Checklist[]) => void;
}

export function SimpleChecklist({
  boardId,
  cardId,
  type,
  checklists,
  onUpdate,
}: SimpleChecklistProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemContent, setNewItemContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Find or create the single checklist for this type
  const checklist = checklists.find((cl) => cl.type === type);
  const items = checklist?.items || [];
  const completed = items.filter((i) => i.isComplete).length;
  const total = items.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  // Create checklist if it doesn't exist when adding first item
  const ensureChecklist = async (): Promise<string | null> => {
    if (checklist) return checklist.id;

    try {
      const newChecklist = await apiFetch<Checklist>(
        `/api/boards/${boardId}/cards/${cardId}/checklists`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: type === 'todo' ? 'Todo' : 'Feedback', type }),
        }
      );
      onUpdate([...checklists, newChecklist]);
      return newChecklist.id;
    } catch (error) {
      console.error('Failed to create checklist:', error);
      toast.error('Failed to create checklist');
    }
    return null;
  };

  const handleAddItem = async () => {
    if (!newItemContent.trim()) return;

    setIsLoading(true);
    try {
      const checklistId = await ensureChecklist();
      if (!checklistId) return;

      const newItem = await apiFetch<ChecklistItem>(
        `/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newItemContent.trim() }),
        }
      );
      onUpdate(
        checklists.map((cl) =>
          cl.id === checklistId
            ? { ...cl, items: [...cl.items, newItem] }
            : cl
        )
      );
      setNewItemContent('');
      setIsAddingItem(false);
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Failed to add checklist item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleItem = async (item: ChecklistItem) => {
    if (!checklist) return;

    // Optimistic: update immediately
    const previousChecklists = checklists;
    onUpdate(
      checklists.map((cl) =>
        cl.id === checklist.id
          ? {
              ...cl,
              items: cl.items.map((i) =>
                i.id === item.id ? { ...i, isComplete: !item.isComplete } : i
              ),
            }
          : cl
      )
    );

    try {
      await apiFetch(
        `/api/boards/${boardId}/cards/${cardId}/checklists/${checklist.id}/items/${item.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isComplete: !item.isComplete }),
        }
      );
    } catch (error) {
      console.error('Failed to toggle item:', error);
      onUpdate(previousChecklists); // Rollback
      toast.error('Failed to update checklist item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!checklist) return;

    // Optimistic: remove immediately
    const previousChecklists = checklists;
    onUpdate(
      checklists.map((cl) =>
        cl.id === checklist.id
          ? { ...cl, items: cl.items.filter((i) => i.id !== itemId) }
          : cl
      )
    );

    try {
      await apiFetch(
        `/api/boards/${boardId}/cards/${cardId}/checklists/${checklist.id}/items/${itemId}`,
        { method: 'DELETE' }
      );
    } catch (error) {
      console.error('Failed to delete item:', error);
      onUpdate(previousChecklists); // Rollback
      toast.error('Failed to delete checklist item');
    }
  };

  return (
    <div className="space-y-2">
      {/* Progress Bar - only show if there are items */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-caption text-text-tertiary">
            <span>{completed}/{total}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                progress === 100 ? 'bg-success' : 'bg-card-task'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Items */}
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-surface-hover"
          >
            <Checkbox
              checked={item.isComplete}
              onCheckedChange={() => handleToggleItem(item)}
              className="mt-0.5"
            />
            <span
              className={cn(
                'flex-1 text-body',
                item.isComplete && 'text-text-tertiary line-through'
              )}
            >
              {item.content}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
              onClick={() => handleDeleteItem(item.id)}
            >
              <Trash2 className="h-3 w-3 text-text-tertiary hover:text-error" />
            </Button>
          </div>
        ))}

        {/* Add Item Form */}
        {isAddingItem ? (
          <div className="flex gap-2">
            <Input
              value={newItemContent}
              onChange={(e) => setNewItemContent(e.target.value)}
              placeholder={`Add ${type === 'todo' ? 'todo' : 'feedback'} item...`}
              className="h-8"
              autoFocus
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddItem();
                if (e.key === 'Escape') {
                  setIsAddingItem(false);
                  setNewItemContent('');
                }
              }}
            />
            <Button
              size="sm"
              className="h-8"
              onClick={handleAddItem}
              disabled={isLoading || !newItemContent.trim()}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => {
                setIsAddingItem(false);
                setNewItemContent('');
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-text-tertiary"
            onClick={() => setIsAddingItem(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add item
          </Button>
        )}
      </div>
    </div>
  );
}
