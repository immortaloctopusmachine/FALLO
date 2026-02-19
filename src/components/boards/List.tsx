'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { MoreHorizontal, Plus, CheckSquare, BookOpen, Layers, FileText, CalendarRange, Unlink, ChevronLeft } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { formatDateRange } from '@/lib/date-utils';

const CARD_TYPES: { value: CardType; label: string; icon: typeof CheckSquare; color: string }[] = [
  { value: 'TASK', label: 'Task', icon: CheckSquare, color: 'text-card-task' },
  { value: 'USER_STORY', label: 'User Story', icon: BookOpen, color: 'text-card-story' },
  { value: 'EPIC', label: 'Epic', icon: Layers, color: 'text-card-epic' },
  { value: 'UTILITY', label: 'Utility', icon: FileText, color: 'text-card-utility' },
];

interface TimelineBlockInfo {
  id: string;
  blockType: {
    name: string;
    color: string;
  };
}

interface ListProps {
  id: string;
  name: string;
  cards: Card[];
  boardId: string;
  onAddCard: (listId: string, title: string, type: CardType) => Promise<void>;
  onCardClick: (card: Card) => void;
  onDeleteList: (listId: string) => Promise<void>;
  onDetachFromTimeline?: (listId: string) => Promise<void>;
  cardTypeFilter?: CardType; // Only show cards of this type
  listColor?: string | null; // Custom list header color
  showDateRange?: boolean; // Show date range in header
  startDate?: string | null;
  endDate?: string | null;
  donePoints?: number; // Story points of completed tasks (for planning view)
  timelineBlock?: TimelineBlockInfo | null; // Timeline sync info
  isCollapsible?: boolean; // Enable collapse functionality
  isCollapsed?: boolean; // External collapse state
  onCollapseChange?: (listId: string, collapsed: boolean) => void; // Collapse callback
  secondaryCards?: Card[]; // Optional secondary section cards
  secondarySectionTitle?: string;
  secondaryEmptyText?: string;
  renderSecondaryCardActions?: (card: Card) => ReactNode;
  extraHeaderActions?: ReactNode;
  useTwoRowHeaderActions?: boolean; // Move add/actions icons to a second header row
}

// Get subtle tint style based on list name — uses backgroundImage so it layers on top of bg-surface
function getListTintStyle(listName: string): React.CSSProperties | undefined {
  const name = listName.toLowerCase();

  // Done/Complete - subtle green
  if (name.includes('done') || name.includes('complete') || name.includes('finished')) {
    return { backgroundImage: 'linear-gradient(rgba(34,197,94,0.05), rgba(34,197,94,0.03))' };
  }

  // Review/QA - subtle purple
  if (name.includes('review') || name.includes('qa') || name.includes('testing')) {
    return { backgroundImage: 'linear-gradient(rgba(168,85,247,0.05), rgba(168,85,247,0.03))' };
  }

  // To Do FX/Animation - subtle maroon
  if (name.includes('animation') || name.includes('fx/')) {
    return { backgroundImage: 'linear-gradient(rgba(128,0,32,0.06), rgba(128,0,32,0.03))' };
  }

  // In Progress/Doing - subtle orange
  if (name.includes('progress') || name.includes('doing') || name.includes('working')) {
    return { backgroundImage: 'linear-gradient(rgba(249,115,22,0.05), rgba(249,115,22,0.03))' };
  }

  // To Do/Backlog - subtle teal
  if (name.includes('to do') || name.includes('todo') || name.includes('backlog') || name.includes('planned')) {
    return { backgroundImage: 'linear-gradient(rgba(20,184,166,0.05), rgba(20,184,166,0.03))' };
  }

  // Default - no tint
  return undefined;
}

export function List({
  id,
  name,
  cards,
  onAddCard,
  onCardClick,
  onDeleteList,
  onDetachFromTimeline,
  cardTypeFilter,
  listColor: customListColor,
  showDateRange,
  startDate,
  endDate,
  donePoints,
  timelineBlock,
  isCollapsible,
  isCollapsed,
  onCollapseChange,
  secondaryCards = [],
  secondarySectionTitle,
  secondaryEmptyText = 'No cards in this section.',
  renderSecondaryCardActions,
  extraHeaderActions,
  useTwoRowHeaderActions = false,
}: ListProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardType, setNewCardType] = useState<CardType>(cardTypeFilter || 'TASK');
  const [isLoading, setIsLoading] = useState(false);

  // Derive tint style from name when no custom color is set
  const listTintStyle = useMemo(() => customListColor ? undefined : getListTintStyle(name), [customListColor, name]);

  // Format date range
  const dateRange = useMemo(() => {
    if (!showDateRange || !startDate || !endDate) return null;
    return formatDateRange(startDate, endDate);
  }, [showDateRange, startDate, endDate]);

  // Custom header style — tint uses backgroundImage so it layers on top of the solid bg-surface
  const customColorStyle = useMemo(() => customListColor
    ? { backgroundImage: `linear-gradient(${customListColor}0a, ${customListColor}06)` }
    : undefined, [customListColor]);

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
  const totalStoryPoints = useMemo(() => cards.reduce((sum, card) => {
    if (card.type === 'TASK') {
      const taskData = card.taskData as { storyPoints?: number | null } | null;
      if (taskData?.storyPoints) {
        return sum + taskData.storyPoints;
      }
    }
    return sum;
  }, 0), [cards]);

  // Handle collapse toggle
  const handleCollapseToggle = () => {
    if (onCollapseChange) {
      onCollapseChange(id, !isCollapsed);
    }
  };

  // Collapsed view (Trello-style vertical header)
  if (isCollapsible && isCollapsed) {
    return (
      <div
        className="flex w-10 shrink-0 flex-col rounded-lg bg-surface cursor-pointer hover:bg-surface-hover transition-colors"
        style={{ ...listTintStyle, ...customColorStyle }}
        onClick={handleCollapseToggle}
      >
        {/* Color indicator bar for custom colored lists */}
        {customListColor && (
          <div
            className="h-1 w-full rounded-t-lg"
            style={{ backgroundColor: customListColor }}
          />
        )}

        {/* Vertical header */}
        <div className="flex-1 flex flex-col items-center pt-3 pb-2 overflow-hidden">
          {/* Rotated content */}
          <div
            className="flex items-center gap-2 whitespace-nowrap"
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
            }}
          >
            <span className="text-title font-semibold text-text-primary">{name}</span>
            <span className="text-caption text-text-tertiary">{cards.length}</span>
            {totalStoryPoints > 0 && (
              <span className="rounded bg-card-task/10 px-1 py-0.5 text-tiny font-medium text-card-task">
                {donePoints !== undefined ? `${donePoints}/${totalStoryPoints}` : totalStoryPoints} SP
              </span>
            )}
          </div>
        </div>

        {/* Timeline sync indicator at bottom */}
        {timelineBlock && (
          <div
            className="mx-1 mb-2 h-1.5 rounded-full"
            style={{ backgroundColor: timelineBlock.blockType.color }}
            title={`Linked to: ${timelineBlock.blockType.name}`}
          />
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[280px] shrink-0 flex-col rounded-lg bg-surface transition-colors',
        isOver && 'ring-2 ring-card-task ring-opacity-50'
      )}
      style={{ ...listTintStyle, ...customColorStyle }}
    >
      {/* Color indicator bar for custom colored lists */}
      {customListColor && (
        <div
          className="h-1 w-full rounded-t-lg"
          style={{ backgroundColor: customListColor }}
        />
      )}

      {/* List Header */}
      <div className={cn(
        'flex items-center justify-between px-2',
        useTwoRowHeaderActions ? 'pt-2 pb-1' : 'py-2'
      )}>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-title font-semibold text-text-primary">{name}</h3>
            <span className="text-caption text-text-tertiary">{cards.length}</span>
            {totalStoryPoints > 0 && (
              <span className="rounded bg-card-task/10 px-1.5 py-0.5 text-tiny font-medium text-card-task">
                {donePoints !== undefined ? `${donePoints}/${totalStoryPoints}` : totalStoryPoints} SP
              </span>
            )}
            {/* Timeline Sync Indicator */}
            {timelineBlock && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-tiny font-medium"
                      style={{
                        backgroundColor: `${timelineBlock.blockType.color}20`,
                        color: timelineBlock.blockType.color,
                      }}
                    >
                      <CalendarRange className="h-3 w-3" />
                      <span>Synced</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Linked to Timeline: {timelineBlock.blockType.name}</p>
                    <p className="text-text-tertiary">Dates sync from Timeline view</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {dateRange && (
            <span className="text-tiny text-text-tertiary">{dateRange}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!useTwoRowHeaderActions && extraHeaderActions}
          {!useTwoRowHeaderActions && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-text-tertiary hover:text-text-primary"
              onClick={() => setIsAddingCard(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {timelineBlock && onDetachFromTimeline && (
                <DropdownMenuItem onClick={() => onDetachFromTimeline(id)}>
                  <Unlink className="h-4 w-4 mr-2" />
                  Detach from Timeline
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDeleteList(id)} className="text-error">
                Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isCollapsible && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-text-tertiary hover:text-text-primary"
                    onClick={handleCollapseToggle}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Collapse list</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {useTwoRowHeaderActions && (
        <div className="flex items-center justify-end gap-1 px-2 pb-2">
          {extraHeaderActions}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-text-tertiary hover:text-text-primary"
            onClick={() => setIsAddingCard(true)}
            title="Add card"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

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
      <div
        className="space-y-2 overflow-y-auto p-2 max-h-[calc(100vh-14rem)]"
        data-list-cards-scroll="true"
      >
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

        {/* Optional secondary section */}
        {(secondarySectionTitle || secondaryCards.length > 0) && (
          <div className="pt-2">
            <div className="mb-2 border-t border-border-subtle pt-2">
              {secondarySectionTitle && (
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-caption font-medium text-text-secondary">
                    {secondarySectionTitle}
                  </span>
                  <span className="text-caption text-text-tertiary">
                    {secondaryCards.length}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {secondaryCards.map((card) => (
                  <div key={`secondary-${card.id}`} className="space-y-1">
                    <CardCompact
                      card={card}
                      onClick={() => onCardClick(card)}
                      sortable={false}
                    />
                    {renderSecondaryCardActions && (
                      <div className="flex justify-end">
                        {renderSecondaryCardActions(card)}
                      </div>
                    )}
                  </div>
                ))}

                {secondaryCards.length === 0 && (
                  <div className="rounded-md border border-dashed border-border-subtle bg-background px-2 py-3 text-caption text-text-tertiary">
                    {secondaryEmptyText}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
