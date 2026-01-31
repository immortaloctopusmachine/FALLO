'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { MoreHorizontal, Plus, CheckSquare, BookOpen, Layers, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CardCompact } from '@/components/cards/CardCompact';
import type { Card, CardType } from '@/types';
import { cn } from '@/lib/utils';

const CARD_TYPES: { value: CardType; label: string; icon: typeof CheckSquare; color: string }[] = [
  { value: 'TASK', label: 'Task', icon: CheckSquare, color: 'text-card-task' },
  { value: 'USER_STORY', label: 'User Story', icon: BookOpen, color: 'text-card-story' },
  { value: 'EPIC', label: 'Epic', icon: Layers, color: 'text-card-epic' },
  { value: 'UTILITY', label: 'Utility', icon: FileText, color: 'text-card-utility' },
];

interface ListProps {
  id: string;
  name: string;
  cards: Card[];
  boardId: string;
  onAddCard: (listId: string, title: string, type: CardType) => Promise<void>;
  onCardClick: (card: Card) => void;
  onDeleteList: (listId: string) => Promise<void>;
  cardTypeFilter?: CardType; // Only show cards of this type
  listColor?: string | null; // Custom list header color
  showDateRange?: boolean; // Show date range in header
  startDate?: string | null;
  endDate?: string | null;
  donePoints?: number; // Story points of completed tasks (for planning view)
}

// Get subtle background color based on list name
function getListColor(listName: string): string {
  const name = listName.toLowerCase();

  // Done/Complete - subtle green
  if (name.includes('done') || name.includes('complete') || name.includes('finished')) {
    return 'bg-green-500/5';
  }

  // Review/QA - subtle purple
  if (name.includes('review') || name.includes('qa') || name.includes('testing')) {
    return 'bg-purple-500/5';
  }

  // In Progress/Doing - subtle orange
  if (name.includes('progress') || name.includes('doing') || name.includes('working')) {
    return 'bg-orange-500/5';
  }

  // To Do/Backlog - subtle teal
  if (name.includes('to do') || name.includes('todo') || name.includes('backlog') || name.includes('planned')) {
    return 'bg-teal-500/5';
  }

  // Default - no extra color
  return '';
}

export function List({
  id,
  name,
  cards,
  onAddCard,
  onCardClick,
  onDeleteList,
  cardTypeFilter,
  listColor: customListColor,
  showDateRange,
  startDate,
  endDate,
  donePoints,
}: ListProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardType, setNewCardType] = useState<CardType>(cardTypeFilter || 'TASK');
  const [isLoading, setIsLoading] = useState(false);

  // Use custom color or derive from name
  const listColor = customListColor ? '' : getListColor(name);

  // Format date range
  const formatDateRange = () => {
    if (!showDateRange || !startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const dateRange = formatDateRange();

  // Custom header style with full background color (subtle) when customListColor is provided
  const customColorStyle = customListColor
    ? {
        backgroundColor: `${customListColor}08`, // Very subtle background (8% opacity)
      }
    : undefined;

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
      await onAddCard(id, newCardTitle.trim(), newCardType);
      setNewCardTitle('');
      setNewCardType('TASK');
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
      setNewCardType('TASK');
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
        listColor,
        isOver && 'ring-2 ring-card-task ring-opacity-50'
      )}
      style={customColorStyle}
    >
      {/* Color indicator bar for custom colored lists */}
      {customListColor && (
        <div
          className="h-1 w-full rounded-t-lg"
          style={{ backgroundColor: customListColor }}
        />
      )}

      {/* List Header */}
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-title font-semibold text-text-primary">{name}</h3>
            <span className="text-caption text-text-tertiary">{cards.length}</span>
            {totalStoryPoints > 0 && (
              <span className="rounded bg-card-task/10 px-1.5 py-0.5 text-tiny font-medium text-card-task">
                {donePoints !== undefined ? `${donePoints}/${totalStoryPoints}` : totalStoryPoints} SP
              </span>
            )}
          </div>
          {dateRange && (
            <span className="text-tiny text-text-tertiary">{dateRange}</span>
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
            {!cardTypeFilter && (
              <Select value={newCardType} onValueChange={(value) => setNewCardType(value as CardType)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={cn('h-4 w-4', type.color)} />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
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
                  setNewCardType('TASK');
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
