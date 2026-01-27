'use client';

import { useState } from 'react';
import { Plus, Trash2, CheckSquare, ListChecks, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Checklist, ChecklistItem } from '@/types';
import { cn } from '@/lib/utils';

interface ChecklistSectionProps {
  checklists: Checklist[];
  boardId: string;
  cardId: string;
  type: 'todo' | 'feedback';
  onUpdate: (checklists: Checklist[]) => void;
}

export function ChecklistSection({
  checklists,
  boardId,
  cardId,
  type,
  onUpdate,
}: ChecklistSectionProps) {
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState('');
  const [addingItemToChecklistId, setAddingItemToChecklistId] = useState<string | null>(null);
  const [newItemContent, setNewItemContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredChecklists = checklists.filter((cl) => cl.type === type);

  const handleAddChecklist = async () => {
    if (!newChecklistName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/checklists`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newChecklistName.trim(), type }),
        }
      );

      const data = await response.json();
      if (data.success) {
        onUpdate([...checklists, data.data]);
        setNewChecklistName('');
        setIsAddingChecklist(false);
      }
    } catch (error) {
      console.error('Failed to add checklist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    try {
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        onUpdate(checklists.filter((cl) => cl.id !== checklistId));
      }
    } catch (error) {
      console.error('Failed to delete checklist:', error);
    }
  };

  const handleAddItem = async (checklistId: string) => {
    if (!newItemContent.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newItemContent.trim() }),
        }
      );

      const data = await response.json();
      if (data.success) {
        onUpdate(
          checklists.map((cl) =>
            cl.id === checklistId
              ? { ...cl, items: [...cl.items, data.data] }
              : cl
          )
        );
        setNewItemContent('');
        setAddingItemToChecklistId(null);
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleItem = async (checklistId: string, item: ChecklistItem) => {
    try {
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items/${item.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isComplete: !item.isComplete }),
        }
      );

      const data = await response.json();
      if (data.success) {
        onUpdate(
          checklists.map((cl) =>
            cl.id === checklistId
              ? {
                  ...cl,
                  items: cl.items.map((i) =>
                    i.id === item.id ? { ...i, isComplete: !item.isComplete } : i
                  ),
                }
              : cl
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  const handleDeleteItem = async (checklistId: string, itemId: string) => {
    try {
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items/${itemId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        onUpdate(
          checklists.map((cl) =>
            cl.id === checklistId
              ? { ...cl, items: cl.items.filter((i) => i.id !== itemId) }
              : cl
          )
        );
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const Icon = type === 'todo' ? CheckSquare : ListChecks;
  const label = type === 'todo' ? 'Todo' : 'Feedback';

  return (
    <div className="space-y-3">
      {filteredChecklists.map((checklist) => {
        const completed = checklist.items.filter((i) => i.isComplete).length;
        const total = checklist.items.length;
        const progress = total > 0 ? (completed / total) * 100 : 0;

        return (
          <div key={checklist.id} className="space-y-2">
            {/* Checklist Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-text-tertiary" />
                <span className="text-body font-medium">{checklist.name}</span>
                {total > 0 && (
                  <span className="text-caption text-text-tertiary">
                    {completed}/{total}
                  </span>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDeleteChecklist(checklist.id)}
                    className="text-error"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete checklist
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Progress Bar */}
            {total > 0 && (
              <div className="h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    progress === 100 ? 'bg-success' : 'bg-card-task'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Items */}
            <div className="space-y-1">
              {checklist.items.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-surface-hover"
                >
                  <Checkbox
                    checked={item.isComplete}
                    onCheckedChange={() => handleToggleItem(checklist.id, item)}
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
                    onClick={() => handleDeleteItem(checklist.id, item.id)}
                  >
                    <Trash2 className="h-3 w-3 text-text-tertiary hover:text-error" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add Item Form */}
            {addingItemToChecklistId === checklist.id ? (
              <div className="flex gap-2">
                <Input
                  value={newItemContent}
                  onChange={(e) => setNewItemContent(e.target.value)}
                  placeholder="Add item..."
                  className="h-8"
                  autoFocus
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddItem(checklist.id);
                    if (e.key === 'Escape') {
                      setAddingItemToChecklistId(null);
                      setNewItemContent('');
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => handleAddItem(checklist.id)}
                  disabled={isLoading || !newItemContent.trim()}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => {
                    setAddingItemToChecklistId(null);
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
                onClick={() => setAddingItemToChecklistId(checklist.id)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add item
              </Button>
            )}
          </div>
        );
      })}

      {/* Add Checklist Form */}
      {isAddingChecklist ? (
        <div className="space-y-2">
          <Input
            value={newChecklistName}
            onChange={(e) => setNewChecklistName(e.target.value)}
            placeholder={`${label} checklist name...`}
            autoFocus
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddChecklist();
              if (e.key === 'Escape') {
                setIsAddingChecklist(false);
                setNewChecklistName('');
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAddChecklist}
              disabled={isLoading || !newChecklistName.trim()}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAddingChecklist(false);
                setNewChecklistName('');
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setIsAddingChecklist(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add {label.toLowerCase()} checklist
        </Button>
      )}
    </div>
  );
}
