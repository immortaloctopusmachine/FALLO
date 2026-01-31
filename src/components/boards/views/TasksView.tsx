'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useRouter } from 'next/navigation';
import { Plus, ChevronRight, ChevronLeft, ExternalLink, Calendar, Link as LinkIcon, BarChart3, Filter, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { List } from '../List';
import { CardCompact } from '@/components/cards/CardCompact';
import { CardModal } from '@/components/cards/CardModal';
import { BurnUpChart } from './BurnUpChart';
import type { Board, Card, CardType, TaskCard, BoardSettings, WeeklyProgress } from '@/types';
import { cn } from '@/lib/utils';
import { DEFAULT_PROJECT_LINKS } from '@/lib/list-templates';

interface TasksViewProps {
  board: Board;
  currentUserId?: string;
  weeklyProgress?: WeeklyProgress[];
  onBoardUpdate?: (board: Board) => void;
}

interface QuickFilter {
  type: 'all' | 'mine' | 'unassigned';
}

export function TasksView({ board: initialBoard, currentUserId, weeklyProgress = [], onBoardUpdate }: TasksViewProps) {
  const router = useRouter();
  const [localBoard, setLocalBoard] = useState(initialBoard);

  // Sync with parent's board state when initialBoard changes
  useEffect(() => {
    setLocalBoard(initialBoard);
  }, [initialBoard]);

  // Notify parent when localBoard changes (excluding initial sync)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (onBoardUpdate) {
      onBoardUpdate(localBoard);
    }
  }, [localBoard, onBoardUpdate]);

  // Wrapper to update local state (parent is notified via useEffect)
  const setBoard = useCallback((updater: Board | ((prev: Board) => Board)) => {
    setLocalBoard((prev) => {
      const newBoard = typeof updater === 'function' ? updater(prev) : updater;
      return newBoard;
    });
  }, []);

  // Use localBoard for display
  const board = localBoard;
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeCardListId, setActiveCardListId] = useState<string | null>(null);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>({ type: 'all' });

  // Filter to only show TASKS view lists and Task cards
  const taskLists = useMemo(() => {
    return board.lists
      .filter(list => list.viewType === 'TASKS' || !list.viewType) // Include legacy lists without viewType
      .map(list => ({
        ...list,
        cards: list.cards.filter(card => card.type === 'TASK'),
      }));
  }, [board.lists]);

  // Get PLANNING view lists for linked card creation
  const planningLists = useMemo(() => {
    return board.lists.filter(list => list.viewType === 'PLANNING');
  }, [board.lists]);

  // Apply quick filters
  const filteredLists = useMemo(() => {
    if (quickFilter.type === 'all') return taskLists;

    return taskLists.map(list => ({
      ...list,
      cards: list.cards.filter(card => {
        const taskCard = card as TaskCard;
        if (quickFilter.type === 'mine') {
          return taskCard.assignees?.some(a => a.userId === currentUserId);
        }
        if (quickFilter.type === 'unassigned') {
          return !taskCard.assignees || taskCard.assignees.length === 0;
        }
        return true;
      }),
    }));
  }, [taskLists, quickFilter, currentUserId]);

  // Get settings
  const settings: BoardSettings = useMemo(() => board.settings || {}, [board.settings]);

  // Project links
  const projectLinks = useMemo(() => [
    {
      label: 'Game Specification',
      url: settings.projectLinks?.gameSpecification,
      hasDefault: false,
    },
    {
      label: 'Game Overview Planning',
      url: settings.projectLinks?.gameOverviewPlanning || DEFAULT_PROJECT_LINKS.gameOverviewPlanning,
      hasDefault: true,
    },
    {
      label: 'Animation Document',
      url: settings.projectLinks?.animationDocument || DEFAULT_PROJECT_LINKS.animationDocument,
      hasDefault: true,
    },
    {
      label: 'Game Sheet Info',
      url: settings.projectLinks?.gameSheetInfo || DEFAULT_PROJECT_LINKS.gameSheetInfo,
      hasDefault: true,
    },
    {
      label: 'Game Name Brainstorming',
      url: settings.projectLinks?.gameNameBrainstorming || DEFAULT_PROJECT_LINKS.gameNameBrainstorming,
      hasDefault: true,
    },
  ], [settings]);

  // Important dates
  const importantDates = useMemo(() => {
    const dates = [];
    if (settings.lastDayStaticArt) {
      dates.push({
        label: 'Last day for static art',
        date: new Date(settings.lastDayStaticArt),
      });
    }
    if (settings.lastDayAnimationTweaks) {
      dates.push({
        label: 'Last day for animation tweaks',
        date: new Date(settings.lastDayAnimationTweaks),
      });
    }
    return dates;
  }, [settings]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const cardToListMap = useMemo(() => {
    const map = new Map<string, string>();
    filteredLists.forEach((list) => {
      list.cards.forEach((card) => {
        map.set(card.id, list.id);
      });
    });
    return map;
  }, [filteredLists]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === 'card') {
      setActiveCard(activeData.card);
      setActiveCardListId(activeData.card.listId);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !activeCard) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== 'card') return;

    let overListId: string | null = null;

    if (overData?.type === 'card') {
      overListId = overData.card.listId;
    } else if (overData?.type === 'list') {
      overListId = overData.list.id;
    }

    if (!overListId) return;

    const currentListId = cardToListMap.get(activeCard.id);
    if (currentListId === overListId) return;

    setBoard((prev) => {
      const newLists = prev.lists.map((list) => {
        if (list.id === currentListId) {
          return {
            ...list,
            cards: list.cards.filter((c) => c.id !== activeCard.id),
          };
        }
        if (list.id === overListId) {
          let insertIndex = list.cards.length;

          if (overData?.type === 'card') {
            const overCardIndex = list.cards.findIndex((c) => c.id === over.id);
            if (overCardIndex !== -1) {
              insertIndex = overCardIndex;
            }
          }

          const updatedCard = { ...activeCard, listId: overListId };
          const newCards = [...list.cards];
          newCards.splice(insertIndex, 0, updatedCard);

          return {
            ...list,
            cards: newCards,
          };
        }
        return list;
      });
      return { ...prev, lists: newLists };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!activeCard || !activeCardListId) {
      setActiveCard(null);
      setActiveCardListId(null);
      return;
    }

    const sourceListId = activeCardListId;

    const currentList = board.lists.find((l) =>
      l.cards.some((c) => c.id === activeCard.id)
    );

    if (!currentList) {
      setActiveCard(null);
      setActiveCardListId(null);
      return;
    }

    const destinationListId = currentList.id;

    if (over && active.id !== over.id) {
      const overData = over.data.current;

      if (overData?.type === 'card' && overData.card.listId === destinationListId) {
        const oldIndex = currentList.cards.findIndex((c) => c.id === activeCard.id);
        const newIndex = currentList.cards.findIndex((c) => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          setBoard((prev) => ({
            ...prev,
            lists: prev.lists.map((l) => {
              if (l.id === destinationListId) {
                return {
                  ...l,
                  cards: arrayMove(l.cards, oldIndex, newIndex),
                };
              }
              return l;
            }),
          }));
        }
      }
    }

    const finalList = board.lists.find((l) => l.id === destinationListId);
    const newPosition = finalList?.cards.findIndex((c) => c.id === activeCard.id) ?? 0;

    try {
      await fetch(`/api/boards/${board.id}/cards/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: activeCard.id,
          sourceListId,
          destinationListId,
          newPosition,
        }),
      });
    } catch (error) {
      console.error('Failed to reorder card:', error);
      router.refresh();
    }

    setActiveCard(null);
    setActiveCardListId(null);
  };

  const collisionDetection = useCallback((args: Parameters<typeof pointerWithin>[0]) => {
    const pointerCollisions = pointerWithin(args);
    const intersectionCollisions = rectIntersection(args);
    const collisions = [...pointerCollisions, ...intersectionCollisions];

    const containerMap = new Map(
      args.droppableContainers.map((container) => [container.id, container])
    );

    const cardCollision = collisions.find((c) => {
      const container = containerMap.get(c.id);
      return container?.data.current?.type === 'card';
    });

    if (cardCollision) {
      return [cardCollision];
    }

    const listCollision = collisions.find((c) => {
      const container = containerMap.get(c.id);
      return container?.data.current?.type === 'list';
    });

    if (listCollision) {
      return [listCollision];
    }

    return collisions.slice(0, 1);
  }, []);

  const handleAddCard = useCallback(async (listId: string, title: string, _type?: CardType) => {
    // In Tasks view, we always create TASK cards regardless of what's passed
    try {
      const response = await fetch(`/api/boards/${board.id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type: 'TASK', listId }),
      });

      const data = await response.json();
      if (data.success) {
        setBoard((prev) => ({
          ...prev,
          lists: prev.lists.map((list) => {
            if (list.id === listId) {
              return {
                ...list,
                cards: [...list.cards, data.data],
              };
            }
            return list;
          }),
        }));
      }
    } catch (error) {
      console.error('Failed to add card:', error);
    }
  }, [board.id]);

  const handleCardClick = useCallback((card: Card) => {
    setSelectedCard(card);
  }, []);

  const handleCardUpdate = useCallback((updatedCard: Card) => {
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((list) => ({
        ...list,
        cards: list.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
      })),
    }));
    setSelectedCard(updatedCard);
  }, []);

  const handleCardDelete = useCallback((cardId: string) => {
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((list) => ({
        ...list,
        cards: list.cards.filter((c) => c.id !== cardId),
      })),
    }));
  }, []);

  const handleRefreshBoard = useCallback(async () => {
    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await response.json();
      if (data.success) {
        setBoard(data.data);
      }
    } catch (error) {
      console.error('Failed to refresh board:', error);
    }
  }, [board.id]);

  const handleDeleteList = useCallback(async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list? All cards will be deleted.')) {
      return;
    }

    try {
      const response = await fetch(`/api/boards/${board.id}/lists/${listId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBoard((prev) => ({
          ...prev,
          lists: prev.lists.filter((l) => l.id !== listId),
        }));
      }
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  }, [board.id]);

  const handleAddList = async () => {
    if (!newListName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/boards/${board.id}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newListName.trim(), viewType: 'TASKS' }),
      });

      const data = await response.json();
      if (data.success) {
        setBoard((prev) => ({
          ...prev,
          lists: [...prev.lists, { ...data.data, cards: [] }],
        }));
        setNewListName('');
        setIsAddingList(false);
      }
    } catch (error) {
      console.error('Failed to add list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Render sidebar
  const renderSidebar = () => (
    <div
      className={cn(
        'shrink-0 border-l border-border bg-surface transition-all duration-300 flex flex-col',
        sidebarExpanded ? 'w-[280px]' : 'w-[48px]'
      )}
    >
      {/* Sidebar Toggle */}
      <button
        onClick={() => setSidebarExpanded(!sidebarExpanded)}
        className="flex items-center justify-center h-10 border-b border-border hover:bg-surface-hover transition-colors"
      >
        {sidebarExpanded ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {sidebarExpanded && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Important Dates */}
          <div className="space-y-2">
            <h3 className="text-caption font-medium text-text-secondary flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Important Dates
            </h3>
            {importantDates.length > 0 ? (
              <div className="space-y-2">
                {importantDates.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-border-subtle bg-background p-2 text-body"
                  >
                    <div className="text-text-tertiary text-tiny">{item.label}</div>
                    <div className="font-medium">{formatDate(item.date)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-caption text-text-tertiary italic">
                No dates set. Configure in board settings.
              </p>
            )}
          </div>

          {/* Project Links */}
          <div className="space-y-2">
            <h3 className="text-caption font-medium text-text-secondary flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Project Links
            </h3>
            <div className="space-y-1">
              {projectLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-body transition-colors',
                    link.url
                      ? 'hover:bg-surface-hover text-text-primary'
                      : 'text-text-tertiary cursor-not-allowed'
                  )}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{link.label}</span>
                  {!link.url && <span className="text-tiny">(not set)</span>}
                </a>
              ))}
            </div>
          </div>

          {/* Burn-up Chart Toggle */}
          <div className="space-y-2">
            <button
              onClick={() => setChartExpanded(!chartExpanded)}
              className="flex items-center gap-2 text-caption font-medium text-text-secondary hover:text-text-primary transition-colors w-full"
            >
              <BarChart3 className="h-4 w-4" />
              Burn-up Chart
              {chartExpanded ? (
                <ChevronRight className="h-4 w-4 ml-auto rotate-90" />
              ) : (
                <ChevronRight className="h-4 w-4 ml-auto" />
              )}
            </button>
            {chartExpanded && (
              <div className="rounded-md border border-border-subtle bg-background p-2">
                <BurnUpChart
                  data={weeklyProgress}
                  height={200}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!isMounted) {
    return (
      <div className="flex flex-col h-full">
        {/* Sub-header placeholder */}
        <div className="shrink-0 border-b border-border bg-surface-hover/50 px-4 py-2">
          <div className="flex items-center gap-4">
            <span className="text-caption text-text-tertiary">Filters:</span>
            <div className="flex gap-2">
              <Button variant="default" size="sm">
                <Filter className="h-3.5 w-3.5 mr-1" />
                All Tasks
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex gap-4 overflow-x-auto p-4">
            {filteredLists.map((list) => (
              <List
                key={list.id}
                id={list.id}
                name={list.name}
                cards={list.cards}
                boardId={board.id}
                onAddCard={handleAddCard}
                onCardClick={handleCardClick}
                onDeleteList={handleDeleteList}
                cardTypeFilter="TASK"
              />
            ))}
          </div>
          {renderSidebar()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header with filters */}
      <div className="shrink-0 border-b border-border bg-surface-hover/50 px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-caption text-text-tertiary">Filters:</span>
          <div className="flex gap-2">
            <Button
              variant={quickFilter.type === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuickFilter({ type: 'all' })}
            >
              <Filter className="h-3.5 w-3.5 mr-1" />
              All Tasks
            </Button>
            <Button
              variant={quickFilter.type === 'mine' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuickFilter({ type: 'mine' })}
            >
              <User className="h-3.5 w-3.5 mr-1" />
              My Tasks
            </Button>
            <Button
              variant={quickFilter.type === 'unassigned' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuickFilter({ type: 'unassigned' })}
            >
              Unassigned
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 flex gap-4 overflow-x-auto p-4">
          {filteredLists.map((list) => (
            <SortableContext
              key={list.id}
              items={list.cards.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <List
                id={list.id}
                name={list.name}
                cards={list.cards}
                boardId={board.id}
                onAddCard={handleAddCard}
                onCardClick={handleCardClick}
                onDeleteList={handleDeleteList}
                cardTypeFilter="TASK"
                listColor={list.color}
              />
            </SortableContext>
          ))}

          {/* Add List */}
          <div className="w-[280px] shrink-0">
            {isAddingList ? (
              <div className="rounded-lg bg-surface p-2">
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Enter list name..."
                  autoFocus
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddList();
                    if (e.key === 'Escape') {
                      setIsAddingList(false);
                      setNewListName('');
                    }
                  }}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddList}
                    disabled={isLoading || !newListName.trim()}
                  >
                    {isLoading ? 'Adding...' : 'Add List'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingList(false);
                      setNewListName('');
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start bg-surface/50 hover:bg-surface"
                onClick={() => setIsAddingList(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add List
              </Button>
            )}
          </div>
        </div>

          <DragOverlay>
            {activeCard && (
              <div className="w-[264px] rotate-2 shadow-lg">
                <CardCompact card={activeCard} onClick={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Sidebar */}
        {renderSidebar()}
      </div>

      {/* Card Modal */}
      <CardModal
        card={selectedCard}
        boardId={board.id}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onUpdate={handleCardUpdate}
        onDelete={handleCardDelete}
        onRefreshBoard={handleRefreshBoard}
        onCardClick={setSelectedCard}
        currentUserId={currentUserId}
        taskLists={taskLists}
        planningLists={planningLists}
      />
    </div>
  );
}
