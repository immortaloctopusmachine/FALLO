'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { CardCompact } from '@/components/cards/CardCompact';
import type { Card, CardType } from '@/types';
import { cn } from '@/lib/utils';

interface ListProps {
  id: string;
  name: string;
  cards: Card[];
  boardId: string;
  onAddCard: (listId: string, title: string, type: CardType) => Promise<void>;
  onCardClick: (card: Card) => void;
  onDeleteList: (listId: string) => Promise<void>;
}

export function List({ id, name, cards, boardId, onAddCard, onCardClick, onDeleteList }: ListProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'list',
      list: { id, name },
    },
  });

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;

    setIsLoading(true);
    try {
      await onAddCard(id, newCardTitle.trim(), 'TASK');
      setNewCardTitle('');
      setIsAddingCard(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddCard();
    } else if (e.key === 'Escape') {
      setIsAddingCard(false);
      setNewCardTitle('');
    }
  };

  // Calculate total story points for the list
  const totalStoryPoints = cards.reduce((sum, card) => {
    if (card.type === 'TASK') {
      const taskData = card.taskData as { storyPoints?: number | null } | null;
      if (taskData?.storyPoints) {
        return sum + taskData.storyPoints;
      }
    }
    return sum;
  }, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full w-[280px] shrink-0 flex-col rounded-lg bg-surface transition-colors',
        isOver && 'ring-2 ring-card-task ring-opacity-50'
      )}
    >
      {/* List Header */}
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-title font-semibold text-text-primary">{name}</h3>
          <span className="text-caption text-text-tertiary">{cards.length}</span>
          {totalStoryPoints > 0 && (
            <span className="rounded bg-card-task/10 px-1.5 py-0.5 text-tiny font-medium text-card-task">
              {totalStoryPoints} SP
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-text-tertiary hover:text-text-primary"
            onClick={() => setIsAddingCard(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDeleteList(id)} className="text-error">
                Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-2 border-t border-border-subtle" />

      {/* Add Card Form (shown below header when adding) */}
      {isAddingCard && (
        <div className="p-2">
          <div className="space-y-2">
            <Input
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter card title..."
              autoFocus
              disabled={isLoading}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddCard}
                disabled={isLoading || !newCardTitle.trim()}
              >
                {isLoading ? 'Adding...' : 'Add'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cards Container */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {cards.map((card) => (
          <CardCompact
            key={card.id}
            card={card}
            onClick={() => onCardClick(card)}
          />
        ))}

        {/* Empty state drop zone */}
        {cards.length === 0 && !isAddingCard && (
          <div className={cn(
            'flex h-20 items-center justify-center rounded-md border-2 border-dashed text-caption text-text-tertiary transition-colors',
            isOver ? 'border-card-task bg-card-task/5' : 'border-border-subtle'
          )}>
            Drop cards here
          </div>
        )}
      </div>
    </div>
  );
}
