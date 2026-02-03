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
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Layers,
  BookOpen,
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Target,
  LayoutGrid,
  CalendarRange,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { List as ListComponent } from '../List';
import { CardCompact } from '@/components/cards/CardCompact';
import { CardModal } from '@/components/cards/CardModal';
import { BurnUpChart } from './BurnUpChart';
import type {
  Board,
  Card,
  CardType,
  EpicCard,
  UserStoryCard,
  TaskCard,
  WeeklyProgress,
  UserStoryFlag,
  List,
} from '@/types';
import { cn } from '@/lib/utils';
import { LIST_TEMPLATES } from '@/lib/list-templates';

interface PlanningViewProps {
  board: Board;
  currentUserId?: string;
  weeklyProgress?: WeeklyProgress[];
  isAdmin?: boolean;
  onBoardUpdate?: (board: Board) => void;
}

// Epic health status
type EpicHealth = 'on_track' | 'at_risk' | 'behind';

interface EpicWithHealth extends EpicCard {
  health: EpicHealth;
  healthReason?: string;
}

export function PlanningView({
  board: initialBoard,
  currentUserId,
  weeklyProgress = [],
  isAdmin: _isAdmin = false,
  onBoardUpdate,
}: PlanningViewProps) {
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
  const [isAddingEpic, setIsAddingEpic] = useState(false);
  const [newEpicTitle, setNewEpicTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(true);
  const [isCreatingLists, setIsCreatingLists] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'STANDARD_SLOT' | 'BRANDED_GAME'>('STANDARD_SLOT');
  const [isSyncingTimeline, setIsSyncingTimeline] = useState(false);
  const [collapsedLists, setCollapsedLists] = useState<Set<string>>(new Set());

  // Filter to get Epics and User Stories
  const epics = useMemo(() => {
    const allCards = board.lists.flatMap(list => list.cards);
    return allCards.filter(card => card.type === 'EPIC') as EpicCard[];
  }, [board.lists]);

  // Filter to only show PLANNING view lists and User Story cards
  const planningLists = useMemo(() => {
    return board.lists
      .filter(list => list.viewType === 'PLANNING')
      .map(list => ({
        ...list,
        cards: list.cards.filter(card => card.type === 'USER_STORY') as UserStoryCard[],
      }));
  }, [board.lists]);

  // Get TASKS view lists for linked card creation
  const taskLists = useMemo(() => {
    return board.lists.filter(list => list.viewType === 'TASKS' || !list.viewType);
  }, [board.lists]);

  // Get the "Done" list from Tasks view to calculate completed points
  const doneListId = useMemo(() => {
    return board.lists.find(list =>
      list.viewType === 'TASKS' && list.phase === 'DONE'
    )?.id;
  }, [board.lists]);

  // Calculate statistics
  const stats = useMemo(() => {
    const allTasks = board.lists.flatMap(list => list.cards.filter(c => c.type === 'TASK')) as TaskCard[];
    const allUserStories = board.lists.flatMap(list => list.cards.filter(c => c.type === 'USER_STORY')) as UserStoryCard[];

    // Total and completed story points
    const totalPoints = allTasks.reduce((sum, task) => {
      const sp = task.taskData?.storyPoints ?? 0;
      return sum + sp;
    }, 0);

    const doneTasks = allTasks.filter(task => {
      // Check if task is in Done list
      return task.listId === doneListId;
    });

    const completedPoints = doneTasks.reduce((sum, task) => {
      const sp = task.taskData?.storyPoints ?? 0;
      return sum + sp;
    }, 0);

    // Velocity (average SP completed per week)
    const velocity = weeklyProgress.length > 0
      ? Math.round(weeklyProgress.reduce((sum, w) => sum + w.completedPoints, 0) / weeklyProgress.length)
      : 0;

    // Stories by status
    const blockedStories = allUserStories.filter(s =>
      s.userStoryData?.flags?.includes('BLOCKED')
    ).length;

    const atRiskStories = allUserStories.filter(s =>
      s.userStoryData?.flags?.includes('HIGH_RISK')
    ).length;

    // Completion percentage
    const completionPct = totalPoints > 0
      ? Math.round((completedPoints / totalPoints) * 100)
      : 0;

    return {
      totalPoints,
      completedPoints,
      velocity,
      blockedStories,
      atRiskStories,
      totalTasks: allTasks.length,
      completedTasks: doneTasks.length,
      totalStories: allUserStories.length,
      completionPct,
    };
  }, [board.lists, doneListId, weeklyProgress]);

  // Calculate epic health
  const epicsWithHealth = useMemo((): EpicWithHealth[] => {
    return epics.map(epic => {
      const connectedStories = epic.connectedUserStories || [];
      const blockedCount = connectedStories.filter(s => {
        const data = s.userStoryData as { flags?: UserStoryFlag[] } | undefined;
        return data?.flags?.includes('BLOCKED');
      }).length;

      const highRiskCount = connectedStories.filter(s => {
        const data = s.userStoryData as { flags?: UserStoryFlag[] } | undefined;
        return data?.flags?.includes('HIGH_RISK');
      }).length;

      let health: EpicHealth = 'on_track';
      let healthReason: string | undefined;

      if (blockedCount > 0) {
        health = 'behind';
        healthReason = `${blockedCount} blocked stor${blockedCount === 1 ? 'y' : 'ies'}`;
      } else if (highRiskCount > 0 || (epic.overallProgress ?? 0) < 25) {
        health = 'at_risk';
        healthReason = highRiskCount > 0
          ? `${highRiskCount} high-risk stor${highRiskCount === 1 ? 'y' : 'ies'}`
          : 'Low progress';
      }

      return { ...epic, health, healthReason };
    });
  }, [epics]);

  // Calculate done points per planning list
  const listDonePoints = useMemo(() => {
    const donePoints: Record<string, number> = {};

    planningLists.forEach(list => {
      let points = 0;
      list.cards.forEach(story => {
        const connectedTasks = (story.connectedTasks || []) as TaskCard[];
        connectedTasks.forEach(task => {
          if (task.listId === doneListId) {
            points += task.taskData?.storyPoints ?? 0;
          }
        });
      });
      donePoints[list.id] = points;
    });

    return donePoints;
  }, [planningLists, doneListId]);

  // Handle list collapse toggle
  const handleCollapseChange = useCallback((listId: string, collapsed: boolean) => {
    setCollapsedLists(prev => {
      const newSet = new Set(prev);
      if (collapsed) {
        newSet.add(listId);
      } else {
        newSet.delete(listId);
      }
      return newSet;
    });
  }, []);

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
    planningLists.forEach((list) => {
      list.cards.forEach((card) => {
        map.set(card.id, list.id);
      });
    });
    return map;
  }, [planningLists]);

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

    if (cardCollision) return [cardCollision];

    const listCollision = collisions.find((c) => {
      const container = containerMap.get(c.id);
      return container?.data.current?.type === 'list';
    });

    if (listCollision) return [listCollision];

    return collisions.slice(0, 1);
  }, []);

  const handleAddEpic = async () => {
    if (!newEpicTitle.trim()) return;

    setIsLoading(true);
    try {
      // Get first list to add epic to
      const firstList = board.lists[0];
      if (!firstList) return;

      const response = await fetch(`/api/boards/${board.id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEpicTitle.trim(),
          type: 'EPIC',
          listId: firstList.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setBoard((prev) => ({
          ...prev,
          lists: prev.lists.map((list, idx) => {
            if (idx === 0) {
              return {
                ...list,
                cards: [...list.cards, data.data],
              };
            }
            return list;
          }),
        }));
        setNewEpicTitle('');
        setIsAddingEpic(false);
      }
    } catch (error) {
      console.error('Failed to add epic:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create planning lists from template
  const handleCreatePlanningLists = async () => {
    setIsCreatingLists(true);
    try {
      const template = LIST_TEMPLATES[selectedTemplate];
      const projectStartDate = board.settings?.projectStartDate
        ? new Date(board.settings.projectStartDate)
        : new Date();

      // Calculate dates for each list
      const currentDate = new Date(projectStartDate);
      const newLists: List[] = [];

      for (const listDef of template.planningLists) {
        const startDate = new Date(currentDate);
        const endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + listDef.durationWeeks * 7 - 1);

        const response = await fetch(`/api/boards/${board.id}/lists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: listDef.name,
            viewType: 'PLANNING',
            phase: listDef.phase,
            color: listDef.color,
            durationWeeks: listDef.durationWeeks,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }),
        });

        const data = await response.json();
        if (data.success) {
          newLists.push({
            ...data.data,
            cards: [],
          });
        }

        // Move to next phase
        currentDate.setDate(currentDate.getDate() + listDef.durationWeeks * 7);
      }

      // Update local state immediately with the new lists
      if (newLists.length > 0) {
        setBoard((prev) => ({
          ...prev,
          lists: [...prev.lists, ...newLists],
        }));
      }
    } catch (error) {
      console.error('Failed to create planning lists:', error);
    } finally {
      setIsCreatingLists(false);
    }
  };

  const handleAddUserStory = useCallback(async (listId: string, title: string, _type?: CardType) => {
    // In Planning view, we always create USER_STORY cards regardless of what's passed
    try {
      const response = await fetch(`/api/boards/${board.id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type: 'USER_STORY', listId }),
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

  const handleDetachFromTimeline = useCallback(async (listId: string) => {
    if (!confirm('Are you sure you want to detach this list from the Timeline? Dates will no longer sync.')) {
      return;
    }

    try {
      // Find the timeline block linked to this list
      const list = board.lists.find(l => l.id === listId);
      if (!list?.timelineBlockId) return;

      // Delete the timeline block (this will unlink the list)
      const response = await fetch(`/api/boards/${board.id}/timeline/blocks/${list.timelineBlockId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBoard((prev) => ({
          ...prev,
          lists: prev.lists.map((l) => {
            if (l.id === listId) {
              return {
                ...l,
                timelineBlockId: null,
                timelineBlock: null,
              };
            }
            return l;
          }),
        }));
      }
    } catch (error) {
      console.error('Failed to detach from timeline:', error);
    }
  }, [board.id, board.lists]);

  // Sync planning lists to timeline (create missing timeline blocks)
  const handleSyncToTimeline = useCallback(async () => {
    setIsSyncingTimeline(true);
    try {
      const response = await fetch(`/api/boards/${board.id}/sync-timeline`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success && data.data.created > 0) {
        // Refresh the board to get updated timeline block info
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to sync timeline:', error);
    } finally {
      setIsSyncingTimeline(false);
    }
  }, [board.id, router]);

  // Check if any planning lists are missing timeline blocks
  const hasUnsyncedLists = useMemo(() => {
    return planningLists.some(list =>
      list.startDate && list.endDate && !list.timelineBlock
    );
  }, [planningLists]);

  // Check if there are planning lists but they're missing dates (need to set project start)
  const hasListsWithoutDates = useMemo(() => {
    return planningLists.some(list => !list.startDate || !list.endDate);
  }, [planningLists]);

  // Get health icon and color
  const getHealthIcon = (health: EpicHealth) => {
    switch (health) {
      case 'on_track':
        return { icon: CheckCircle2, color: 'text-success' };
      case 'at_risk':
        return { icon: AlertTriangle, color: 'text-warning' };
      case 'behind':
        return { icon: AlertTriangle, color: 'text-error' };
    }
  };

  // Render stats dashboard
  const renderStats = () => (
    <div className={cn(
      'border-b border-border bg-surface transition-all duration-300 overflow-hidden',
      statsExpanded ? 'max-h-[400px]' : 'max-h-10'
    )}>
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => setStatsExpanded(!statsExpanded)}
          className="flex items-center gap-2 text-caption font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          {statsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <BarChart3 className="h-4 w-4" />
          Project Statistics
        </button>
        <div className="flex items-center gap-2">
          {hasListsWithoutDates && (
            <span className="text-tiny text-text-tertiary">
              Set project start date in settings to enable timeline sync
            </span>
          )}
          {hasUnsyncedLists && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncToTimeline}
              disabled={isSyncingTimeline}
              className="gap-2"
            >
              <CalendarRange className="h-4 w-4" />
              {isSyncingTimeline ? 'Syncing...' : 'Sync to Timeline'}
            </Button>
          )}
        </div>
      </div>

      {statsExpanded && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Completion */}
            <div className="rounded-lg border border-border-subtle bg-background p-3">
              <div className="flex items-center gap-2 text-caption text-text-tertiary mb-1">
                <Target className="h-3.5 w-3.5" />
                Completion
              </div>
              <div className="text-heading font-bold text-success">{stats.completionPct}%</div>
              <div className="text-tiny text-text-tertiary">
                {stats.completedPoints}/{stats.totalPoints} SP
              </div>
            </div>

            {/* Velocity */}
            <div className="rounded-lg border border-border-subtle bg-background p-3">
              <div className="flex items-center gap-2 text-caption text-text-tertiary mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Velocity
              </div>
              <div className="text-heading font-bold">{stats.velocity} SP</div>
              <div className="text-tiny text-text-tertiary">per week avg</div>
            </div>

            {/* Tasks */}
            <div className="rounded-lg border border-border-subtle bg-background p-3">
              <div className="flex items-center gap-2 text-caption text-text-tertiary mb-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tasks
              </div>
              <div className="text-heading font-bold">
                {stats.completedTasks}/{stats.totalTasks}
              </div>
              <div className="text-tiny text-text-tertiary">completed</div>
            </div>

            {/* Stories */}
            <div className="rounded-lg border border-border-subtle bg-background p-3">
              <div className="flex items-center gap-2 text-caption text-text-tertiary mb-1">
                <BookOpen className="h-3.5 w-3.5" />
                Stories
              </div>
              <div className="text-heading font-bold">{stats.totalStories}</div>
              <div className="text-tiny text-text-tertiary">
                {stats.blockedStories > 0 && (
                  <span className="text-error">{stats.blockedStories} blocked</span>
                )}
              </div>
            </div>

            {/* At Risk */}
            <div className="rounded-lg border border-border-subtle bg-background p-3">
              <div className="flex items-center gap-2 text-caption text-text-tertiary mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                At Risk
              </div>
              <div className={cn(
                'text-heading font-bold',
                stats.atRiskStories > 0 ? 'text-warning' : 'text-success'
              )}>
                {stats.atRiskStories}
              </div>
              <div className="text-tiny text-text-tertiary">stories</div>
            </div>

            {/* Burn-up Chart */}
            <div className="rounded-lg border border-border-subtle bg-background p-3 col-span-2 md:col-span-4 lg:col-span-1">
              <div className="flex items-center gap-2 text-caption text-text-tertiary mb-2">
                <Clock className="h-3.5 w-3.5" />
                Progress
              </div>
              <BurnUpChart data={weeklyProgress} height={80} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render epics sidebar
  const renderEpicsSidebar = () => (
    <div className="w-[280px] shrink-0 border-r border-border bg-surface flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-card-epic" />
          <span className="text-title font-semibold">Epics</span>
          <span className="text-caption text-text-tertiary">{epics.length}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-text-tertiary hover:text-text-primary"
          onClick={() => setIsAddingEpic(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Total SP */}
      <div className="px-3 py-2 border-b border-border-subtle text-caption text-text-tertiary">
        Total: <span className="font-medium text-card-epic">{stats.totalPoints} SP</span>
      </div>

      {/* Add Epic Form */}
      {isAddingEpic && (
        <div className="p-2 border-b border-border-subtle">
          <Input
            value={newEpicTitle}
            onChange={(e) => setNewEpicTitle(e.target.value)}
            placeholder="Epic title..."
            autoFocus
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddEpic();
              if (e.key === 'Escape') {
                setIsAddingEpic(false);
                setNewEpicTitle('');
              }
            }}
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={handleAddEpic}
              disabled={isLoading || !newEpicTitle.trim()}
            >
              {isLoading ? 'Adding...' : 'Add'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAddingEpic(false);
                setNewEpicTitle('');
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Epics List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {epicsWithHealth.map((epic) => {
          const { icon: HealthIcon, color: healthColor } = getHealthIcon(epic.health);
          return (
            <div
              key={epic.id}
              onClick={() => handleCardClick(epic)}
              className="rounded-lg border border-border-subtle bg-background p-3 cursor-pointer hover:border-card-epic/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-body font-medium text-text-primary line-clamp-2">
                  {epic.title}
                </h4>
                <span title={epic.healthReason}>
                  <HealthIcon className={cn('h-4 w-4 shrink-0', healthColor)} />
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-card-epic transition-all"
                  style={{ width: `${epic.overallProgress ?? 0}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-tiny text-text-tertiary">
                <span>{epic.storyCount ?? 0} stories</span>
                <span>{epic.totalStoryPoints ?? 0} SP</span>
              </div>
            </div>
          );
        })}

        {epics.length === 0 && !isAddingEpic && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Layers className="h-8 w-8 text-text-tertiary mb-2" />
            <p className="text-caption text-text-tertiary">No epics yet</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setIsAddingEpic(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Epic
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (!isMounted) {
    return (
      <div className="flex flex-col h-full">
        {renderStats()}
        <div className="flex flex-1 overflow-hidden">
          {renderEpicsSidebar()}
          {planningLists.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center text-text-tertiary">
                <LayoutGrid className="h-12 w-12 mx-auto mb-2" />
                <p>Loading planning lists...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex gap-4 overflow-x-auto p-4">
              {planningLists.map((list) => (
                <ListComponent
                  key={list.id}
                  id={list.id}
                  name={list.name}
                  cards={list.cards}
                  boardId={board.id}
                  onAddCard={handleAddUserStory}
                  onCardClick={handleCardClick}
                  onDeleteList={handleDeleteList}
                  onDetachFromTimeline={handleDetachFromTimeline}
                  cardTypeFilter="USER_STORY"
                  listColor={list.color}
                  showDateRange
                  startDate={list.startDate}
                  endDate={list.endDate}
                  donePoints={listDonePoints[list.id]}
                  timelineBlock={list.timelineBlock}
                  isCollapsible
                  isCollapsed={collapsedLists.has(list.id)}
                  onCollapseChange={handleCollapseChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stats Dashboard */}
      {renderStats()}

      <div className="flex flex-1 overflow-hidden">
        {/* Epics Sidebar */}
        {renderEpicsSidebar()}

        {/* Main Content - User Stories Kanban */}
        {planningLists.length === 0 ? (
          /* Empty state - no planning lists */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md text-center">
              <LayoutGrid className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-heading font-semibold mb-2">No Planning Lists Yet</h3>
              <p className="text-body text-text-secondary mb-6">
                Create planning lists to organize your User Stories by phase.
                Choose a template to get started quickly.
              </p>

              {/* Template Selection */}
              <div className="flex gap-4 mb-6 justify-center">
                <button
                  onClick={() => setSelectedTemplate('STANDARD_SLOT')}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-colors text-left',
                    selectedTemplate === 'STANDARD_SLOT'
                      ? 'border-card-story bg-card-story/5'
                      : 'border-border hover:border-border-subtle'
                  )}
                >
                  <div className="font-medium mb-1">Standard Slot</div>
                  <div className="text-caption text-text-tertiary">
                    7 phases, 14 weeks total
                  </div>
                </button>
                <button
                  onClick={() => setSelectedTemplate('BRANDED_GAME')}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-colors text-left',
                    selectedTemplate === 'BRANDED_GAME'
                      ? 'border-card-story bg-card-story/5'
                      : 'border-border hover:border-border-subtle'
                  )}
                >
                  <div className="font-medium mb-1">Branded Game</div>
                  <div className="text-caption text-text-tertiary">
                    4 phases, 6 weeks total
                  </div>
                </button>
              </div>

              <Button
                onClick={handleCreatePlanningLists}
                disabled={isCreatingLists}
                className="gap-2"
              >
                {isCreatingLists ? (
                  'Creating Lists...'
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Planning Lists
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-1 flex gap-4 overflow-x-auto p-4">
              {planningLists.map((list) => (
                <SortableContext
                  key={list.id}
                  items={list.cards.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ListComponent
                    id={list.id}
                    name={list.name}
                    cards={list.cards}
                    boardId={board.id}
                    onAddCard={handleAddUserStory}
                    onCardClick={handleCardClick}
                    onDeleteList={handleDeleteList}
                    onDetachFromTimeline={handleDetachFromTimeline}
                    cardTypeFilter="USER_STORY"
                    listColor={list.color}
                    showDateRange
                    startDate={list.startDate}
                    endDate={list.endDate}
                    donePoints={listDonePoints[list.id]}
                    timelineBlock={list.timelineBlock}
                    isCollapsible
                    isCollapsed={collapsedLists.has(list.id)}
                    onCollapseChange={handleCollapseChange}
                  />
                </SortableContext>
              ))}
            </div>

            <DragOverlay>
              {activeCard && (
                <div className="w-[264px] rotate-2 shadow-lg">
                  <CardCompact card={activeCard} onClick={() => {}} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
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
