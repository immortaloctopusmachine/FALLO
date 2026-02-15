'use client';

import Link from 'next/link';
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
import { Plus, ChevronRight, ChevronLeft, ExternalLink, Calendar, Link as LinkIcon, BarChart3, Filter, User } from 'lucide-react';
import { toast } from 'sonner';
import { useBoardMutations } from '@/hooks/api/use-board-mutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { List } from '../List';
import { CardCompact } from '@/components/cards/CardCompact';
import { CardModal } from '@/components/cards/CardModal';
import { BurnUpChart } from './BurnUpChart';
import type { Board, Card, CardType, TaskCard, BoardSettings, WeeklyProgress } from '@/types';
import { cn } from '@/lib/utils';
import { formatDisplayDate, getBusinessDaysBetween } from '@/lib/date-utils';
import { buildDependencyChain, type ChainLink } from '@/lib/task-presets';

interface TasksViewProps {
  board: Board;
  currentUserId?: string;
  weeklyProgress?: WeeklyProgress[];
  canViewQualitySummaries?: boolean;
}

interface QuickFilter {
  type: 'all' | 'mine' | 'unassigned';
}

interface SidebarLink {
  label: string;
  url: string;
  isInternal?: boolean;
}

interface ImportantDateItem {
  label: string;
  date: Date;
  note?: string;
}

function parseOptionalDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function TasksView({ board: initialBoard, currentUserId, weeklyProgress = [], canViewQualitySummaries = false }: TasksViewProps) {
  const [localBoard, setLocalBoard] = useState(initialBoard);
  const mutations = useBoardMutations(initialBoard.id);
  const boardSnapshotRef = useRef<Board | null>(null);

  // Sync with parent's board state when initialBoard changes
  useEffect(() => {
    setLocalBoard(initialBoard);
  }, [initialBoard]);

  // Wrapper to update local state
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
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [chartExpanded, setChartExpanded] = useState(false);
  // Default to "My Tasks" for non-admin members
  const defaultFilterType = useMemo(() => {
    const member = initialBoard.members?.find(m => m.userId === currentUserId);
    const isBoardAdmin = member?.permission === 'ADMIN' || member?.permission === 'SUPER_ADMIN';
    return isBoardAdmin ? 'all' : 'mine';
  }, [initialBoard.members, currentUserId]);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>({ type: defaultFilterType as QuickFilter['type'] });

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

  const allCards = useMemo(() => board.lists.flatMap((list) => list.cards), [board.lists]);

  // Compute dependency chain map for all task cards
  const chainMap = useMemo(() => {
    const map = new Map<string, ChainLink[]>();
    for (const card of allCards) {
      if (card.type !== 'TASK') continue;
      if (map.has(card.id)) continue; // Already part of a computed chain
      const chain = buildDependencyChain(card.id, allCards);
      if (chain) {
        for (const link of chain) {
          map.set(link.id, chain);
        }
      }
    }
    return map;
  }, [allCards]);

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

  const tweakBlockEndDate = useMemo(() => {
    const timelineBlocks = board.timelineBlocks || [];
    let latestTweakDate: Date | null = null;

    for (const block of timelineBlocks) {
      if (!block.blockType.name.toLowerCase().includes('tweak')) continue;
      const endDate = parseOptionalDate(block.endDate);
      if (!endDate) continue;
      if (!latestTweakDate || endDate.getTime() > latestTweakDate.getTime()) {
        latestTweakDate = endDate;
      }
    }

    return latestTweakDate;
  }, [board.timelineBlocks]);

  const lastTweakDate = useMemo(() => {
    const override = parseOptionalDate(settings.lastTweakOverride);
    if (override) return override;
    if (tweakBlockEndDate) return tweakBlockEndDate;
    return parseOptionalDate(settings.lastDayAnimationTweaks);
  }, [settings.lastTweakOverride, settings.lastDayAnimationTweaks, tweakBlockEndDate]);

  const lastStaticAssetsDate = useMemo(() => {
    const override = parseOptionalDate(settings.lastStaticArtOverride);
    if (override) return override;

    if (lastTweakDate) {
      const calculated = new Date(lastTweakDate);
      calculated.setDate(calculated.getDate() - 2); // Friday -> Wednesday
      return calculated;
    }

    return parseOptionalDate(settings.lastDayStaticArt);
  }, [settings.lastStaticArtOverride, settings.lastDayStaticArt, lastTweakDate]);

  const lastStaticAssetsCountdown = useMemo(() => {
    if (!lastStaticAssetsDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(lastStaticAssetsDate);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() >= today.getTime()) {
      const daysLeft = Math.max(0, getBusinessDaysBetween(today, target) - 1);
      const weeksLeft = (daysLeft / 5).toFixed(1);
      return `${daysLeft} working day${daysLeft === 1 ? '' : 's'} left (${weeksLeft} weeks)`;
    }

    const daysOverdue = Math.max(0, getBusinessDaysBetween(target, today) - 1);
    const weeksOverdue = (daysOverdue / 5).toFixed(1);
    return `Overdue by ${daysOverdue} working day${daysOverdue === 1 ? '' : 's'} (${weeksOverdue} weeks)`;
  }, [lastStaticAssetsDate]);

  const importantDates = useMemo<ImportantDateItem[]>(() => {
    const dates: ImportantDateItem[] = [];
    if (lastTweakDate) {
      dates.push({
        label: 'Last Tweak',
        date: lastTweakDate,
      });
    }
    if (lastStaticAssetsDate) {
      dates.push({
        label: 'Last Static Assets',
        date: lastStaticAssetsDate,
        note: lastStaticAssetsCountdown || undefined,
      });
    }
    return dates;
  }, [lastTweakDate, lastStaticAssetsDate, lastStaticAssetsCountdown]);

  const projectLinks = useMemo<SidebarLink[]>(() => {
    const links: SidebarLink[] = [
      { label: 'Project Page', url: `/projects/${board.id}`, isInternal: true },
      { label: 'Spine Tracker', url: `/boards/${board.id}?view=spine`, isInternal: true },
    ];

    if (settings.projectLinks?.oneDrive) {
      links.push({ label: 'OneDrive', url: settings.projectLinks.oneDrive });
    }
    if (settings.projectLinks?.gameSpecification) {
      links.push({ label: 'Game Specification', url: settings.projectLinks.gameSpecification });
    }
    if (settings.projectLinks?.gameSheetInfo) {
      links.push({ label: 'Game Sheet', url: settings.projectLinks.gameSheetInfo });
    }

    return links;
  }, [board.id, settings.projectLinks]);

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
      boardSnapshotRef.current = board; // snapshot for rollback
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
    let didMove = sourceListId !== destinationListId;
    let newPosition = currentList.cards.findIndex((c) => c.id === activeCard.id);

    if (over && active.id !== over.id) {
      const overData = over.data.current;

      if (overData?.type === 'card' && overData.card.listId === destinationListId) {
        const oldIndex = currentList.cards.findIndex((c) => c.id === activeCard.id);
        const newIndex = currentList.cards.findIndex((c) => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          didMove = true;
          newPosition = newIndex;
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

    if (!didMove || newPosition < 0) {
      boardSnapshotRef.current = null;
      setActiveCard(null);
      setActiveCardListId(null);
      return;
    }

    try {
      await mutations.reorderCard({
        cardId: activeCard.id,
        sourceListId,
        destinationListId,
        newPosition,
      });
    } catch (error) {
      console.error('Failed to reorder card:', error);
      if (boardSnapshotRef.current) {
        setBoard(boardSnapshotRef.current);
      }
      toast.error('Failed to move card');
    }

    boardSnapshotRef.current = null;
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
    const tempId = crypto.randomUUID();
    const tempCard: TaskCard = {
      id: tempId,
      type: 'TASK',
      title,
      description: null,
      position: 999,
      color: null,
      featureImage: null,
      featureImagePosition: 50,
      listId,
      parentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
      taskData: { storyPoints: null, deadline: null, linkedUserStoryId: null, linkedEpicId: null },
      assignees: [],
      checklists: [],
      _count: { attachments: 0, comments: 0 },
    };

    // Optimistic: show card immediately
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((list) =>
        list.id === listId ? { ...list, cards: [...list.cards, tempCard] } : list
      ),
    }));

    try {
      const realCard = await mutations.createCard({ title, type: 'TASK', listId });
      // Replace temp with real server data
      setBoard((prev) => ({
        ...prev,
        lists: prev.lists.map((list) => ({
          ...list,
          cards: list.cards.map((c) => (c.id === tempId ? realCard : c)),
        })),
      }));
    } catch (error) {
      console.error('Failed to add card:', error);
      // Remove temp card
      setBoard((prev) => ({
        ...prev,
        lists: prev.lists.map((list) => ({
          ...list,
          cards: list.cards.filter((c) => c.id !== tempId),
        })),
      }));
      toast.error('Failed to create card');
    }
  }, [setBoard, mutations]);

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
  }, [setBoard]);

  const handleCardDelete = useCallback((cardId: string) => {
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((list) => ({
        ...list,
        cards: list.cards.filter((c) => c.id !== cardId),
      })),
    }));
  }, [setBoard]);

  const handleLinkedCardCreated = useCallback((newCard: Card) => {
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((list) => {
        if (list.id !== newCard.listId) return list;
        if (list.cards.some((card) => card.id === newCard.id)) return list;
        return { ...list, cards: [...list.cards, newCard] };
      }),
    }));
  }, [setBoard]);

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
  }, [board.id, setBoard]);

  const handleAddList = async () => {
    if (!newListName.trim()) return;

    const name = newListName.trim();
    const tempId = crypto.randomUUID();
    const tempList: import('@/types').List = {
      id: tempId,
      name,
      position: board.lists.length,
      boardId: board.id,
      cards: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewType: 'TASKS',
    };

    // Optimistic: show list immediately, reset input
    setBoard((prev) => ({ ...prev, lists: [...prev.lists, tempList] }));
    setNewListName('');
    setIsAddingList(false);

    try {
      const realList = await mutations.createList({ name, viewType: 'TASKS' });
      // Replace temp with real server data
      setBoard((prev) => ({
        ...prev,
        lists: prev.lists.map((l) => (l.id === tempId ? { ...realList, cards: [] } : l)),
      }));
    } catch (error) {
      console.error('Failed to add list:', error);
      // Remove temp list
      setBoard((prev) => ({
        ...prev,
        lists: prev.lists.filter((l) => l.id !== tempId),
      }));
      toast.error('Failed to create list');
    }
  };

  // Render sidebar
  const renderSidebar = () => (
    <div
      className={cn(
        'shrink-0 border-l border-border bg-surface transition-all duration-300 flex flex-col',
        sidebarExpanded ? 'w-[280px]' : 'w-[48px]'
      )}
      style={{ backgroundColor: 'color-mix(in srgb, var(--surface) 80%, transparent)' }}
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
                    <div className="font-medium">{formatDisplayDate(item.date)}</div>
                    {item.note ? (
                      <div className="mt-1 text-tiny text-text-tertiary">{item.note}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-caption text-text-tertiary italic">
                No dates set. Configure on the project page.
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
              {projectLinks.map((link, idx) => {
                const className = 'flex items-center gap-2 rounded-md px-2 py-1.5 text-body transition-colors hover:bg-surface-hover text-text-primary';
                return link.isInternal ? (
                  <Link
                    key={idx}
                    href={link.url}
                    className={className}
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </Link>
                ) : (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </a>
                );
              })}
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
        <div
          className="shrink-0 border-b border-border bg-surface px-4 py-2"
          style={{ backgroundColor: 'color-mix(in srgb, var(--surface) 80%, transparent)' }}
        >
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
          <div className="flex-1 flex items-start gap-4 overflow-x-auto p-4">
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
                chainMap={chainMap}
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
      <div
        className="shrink-0 border-b border-border bg-surface px-4 py-2"
        style={{ backgroundColor: 'color-mix(in srgb, var(--surface) 80%, transparent)' }}
      >
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
          <div className="flex-1 flex items-start gap-4 overflow-x-auto p-4">
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
                chainMap={chainMap}
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
                    disabled={!newListName.trim()}
                  >
                    Add List
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingList(false);
                      setNewListName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start bg-surface hover:bg-surface"
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
        onLinkedCardCreated={handleLinkedCardCreated}
        onCardClick={setSelectedCard}
        currentUserId={currentUserId}
        canViewQualitySummaries={canViewQualitySummaries}
        taskLists={taskLists}
        planningLists={planningLists}
        allCards={allCards}
      />
    </div>
  );
}
