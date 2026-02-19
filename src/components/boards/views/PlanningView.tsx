'use client';

import { useState, useCallback, useMemo, useEffect, useRef, type WheelEvent } from 'react';
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
import { toast } from 'sonner';
import { useBoardMutations } from '@/hooks/api/use-board-mutations';
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
  ArrowRight,
  Boxes,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { List as ListComponent } from '../List';
import { CardCompact } from '@/components/cards/CardCompact';
import { CardModal } from '@/components/cards/CardModal';
import { AddModuleToBoardModal } from '@/components/boards/AddModuleToBoardModal';
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
  canViewQualitySummaries?: boolean;
}

// Epic health status
type EpicHealth = 'on_track' | 'at_risk' | 'behind';

interface EpicWithHealth extends EpicCard {
  health: EpicHealth;
  healthReason?: string;
}

interface PlanningListSection extends List {
  userStories: UserStoryCard[];
  stagedTasks: TaskCard[];
}

const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const parseListDate = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const isListOlderThanToday = (list: Pick<List, 'startDate' | 'endDate'>) => {
  const today = getTodayStart();
  const endDate = parseListDate(list.endDate);
  if (endDate) {
    return endDate.getTime() < today.getTime();
  }

  const startDate = parseListDate(list.startDate);
  if (startDate) {
    return startDate.getTime() < today.getTime();
  }

  return false;
};

const getAutoCollapsedPlanningListIds = (lists: Array<Pick<List, 'id' | 'startDate' | 'endDate'>>) => {
  const collapsed = new Set<string>();
  for (const list of lists) {
    if (isListOlderThanToday(list)) {
      collapsed.add(list.id);
    }
  }
  return collapsed;
};

interface ProjectQualitySummary {
  totals: {
    doneTaskCount: number;
    finalizedTaskCount: number;
    overallAverage: number | null;
    overallQualityTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';
  };
  tierDistribution: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    UNSCORED: number;
  };
  perDimension: Array<{
    dimensionId: string;
    name: string;
    average: number | null;
    count: number;
    confidence: 'GREEN' | 'AMBER' | 'RED';
  }>;
  iterationMetrics: {
    averageCyclesToDone: number | null;
    highChurnThreshold: number;
    highChurnCount: number;
    highChurnRate: number | null;
  };
}

interface QualityAdjustedVelocityMetrics {
  totals: {
    doneTaskCount: number;
    scoredTaskCount: number;
    totalRawPoints: number | null;
    totalAdjustedPoints: number | null;
    totalAdjustmentDelta: number | null;
    overallAdjustmentFactor: number | null;
  };
  series: Array<{
    weekStart: string;
    perWeek: {
      taskCount: number;
      scoredTaskCount: number;
      rawPoints: number | null;
      adjustedPoints: number | null;
      adjustmentDelta: number | null;
      adjustmentFactor: number | null;
    };
  }>;
}

interface IterationDistributionMetrics {
  totals: {
    doneTaskCount: number;
    scoredTaskCount: number;
    withReviewCyclesCount: number;
    withoutReviewCyclesCount: number;
    averageCyclesToDone: number | null;
    highChurnThreshold: number;
    highChurnCount: number;
    highChurnRate: number | null;
  };
  distribution: Array<{
    cycleCount: number;
    taskCount: number;
    percentage: number | null;
    scoredTaskCount: number;
    averageQuality: number | null;
    qualityTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';
  }>;
}

export function PlanningView({
  board: initialBoard,
  currentUserId,
  weeklyProgress = [],
  isAdmin: _isAdmin = false,
  canViewQualitySummaries = false,
}: PlanningViewProps) {
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
  const [isAddingEpic, setIsAddingEpic] = useState(false);
  const [newEpicTitle, setNewEpicTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [isCreatingLists, setIsCreatingLists] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'STANDARD_SLOT' | 'BRANDED_GAME'>('STANDARD_SLOT');
  const [isSyncingTimeline, setIsSyncingTimeline] = useState(false);
  const initialPlanningLists = useMemo(
    () => initialBoard.lists.filter((list) => list.viewType === 'PLANNING'),
    [initialBoard.lists]
  );
  const [collapsedLists, setCollapsedLists] = useState<Set<string>>(
    () => getAutoCollapsedPlanningListIds(initialPlanningLists)
  );
  const knownPlanningListIdsRef = useRef<Set<string>>(
    new Set(initialPlanningLists.map((list) => list.id))
  );
  const initializedBoardIdRef = useRef<string | null>(null);
  const [releasingTaskIds, setReleasingTaskIds] = useState<Set<string>>(new Set());
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [moduleDefaultPlanningListId, setModuleDefaultPlanningListId] = useState<string | undefined>(undefined);
  const [qualitySummary, setQualitySummary] = useState<ProjectQualitySummary | null>(null);
  const [qualityAdjustedVelocity, setQualityAdjustedVelocity] =
    useState<QualityAdjustedVelocityMetrics | null>(null);
  const [iterationDistribution, setIterationDistribution] =
    useState<IterationDistributionMetrics | null>(null);
  const [isLoadingQualitySummary, setIsLoadingQualitySummary] = useState(false);
  const [qualitySummaryExpanded, setQualitySummaryExpanded] = useState(false);

  // Only fetch quality data when user explicitly expands the Team Quality Summary section
  useEffect(() => {
    if (!canViewQualitySummaries || !qualitySummaryExpanded) {
      return;
    }

    // Skip if already loaded for this board
    if (qualitySummary) return;

    let isCancelled = false;

    const loadQualitySummary = async () => {
      setIsLoadingQualitySummary(true);
      try {
        const fetchMetric = async <T,>(url: string): Promise<T> => {
          const response = await fetch(url);
          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error?.message || `Failed to load ${url}`);
          }

          return data.data as T;
        };

        const [summaryData, adjustedVelocityData, iterationData] =
          await Promise.all([
            fetchMetric<ProjectQualitySummary>(`/api/metrics/projects/${board.id}/quality-summary`),
            fetchMetric<QualityAdjustedVelocityMetrics>(
              `/api/metrics/quality-adjusted-velocity?projectId=${board.id}`
            ),
            fetchMetric<IterationDistributionMetrics>(
              `/api/metrics/iteration-distribution?projectId=${board.id}`
            ),
          ]);

        if (!isCancelled) {
          setQualitySummary(summaryData);
          setQualityAdjustedVelocity(adjustedVelocityData);
          setIterationDistribution(iterationData);
        }
      } catch {
        if (!isCancelled) {
          setQualitySummary(null);
          setQualityAdjustedVelocity(null);
          setIterationDistribution(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingQualitySummary(false);
        }
      }
    };

    void loadQualitySummary();

    return () => {
      isCancelled = true;
    };
  }, [board.id, canViewQualitySummaries, qualitySummaryExpanded, qualitySummary]);

  // Filter to get Epics and User Stories
  const epics = useMemo(() => {
    const allCards = board.lists.flatMap(list => list.cards);
    return allCards.filter(card => card.type === 'EPIC') as EpicCard[];
  }, [board.lists]);

  // Filter to only show PLANNING view lists
  const planningLists = useMemo(() => {
    return board.lists
      .filter(list => list.viewType === 'PLANNING')
      .map(list => ({
        ...list,
        cards: list.cards,
      }));
  }, [board.lists]);

  const planningListSections = useMemo<PlanningListSection[]>(() => {
    return planningLists.map((list) => {
      const userStories = list.cards.filter((card) => card.type === 'USER_STORY') as UserStoryCard[];
      const stagedTasks = list.cards.filter((card) => {
        if (card.type !== 'TASK') return false;
        const task = card as TaskCard;
        return task.taskData?.releaseMode === 'STAGED' && !task.taskData?.releasedAt;
      }) as TaskCard[];

      return {
        ...list,
        userStories,
        stagedTasks,
      };
    });
  }, [planningLists]);

  useEffect(() => {
    if (initializedBoardIdRef.current === board.id) return;

    initializedBoardIdRef.current = board.id;
    knownPlanningListIdsRef.current = new Set(planningListSections.map((list) => list.id));
    setCollapsedLists(getAutoCollapsedPlanningListIds(planningListSections));
  }, [board.id, planningListSections]);

  useEffect(() => {
    setCollapsedLists((prev) => {
      const next = new Set(prev);
      let changed = false;

      for (const list of planningListSections) {
        if (knownPlanningListIdsRef.current.has(list.id)) continue;
        knownPlanningListIdsRef.current.add(list.id);
        if (isListOlderThanToday(list)) {
          next.add(list.id);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [planningListSections]);

  // Get TASKS view lists for linked card creation
  const taskLists = useMemo(() => {
    return board.lists.filter(list => list.viewType === 'TASKS' || !list.viewType);
  }, [board.lists]);

  const allCards = useMemo(() => board.lists.flatMap((list) => list.cards), [board.lists]);

  const tasksByUserStory = useMemo(() => {
    const map = new Map<string, TaskCard[]>();

    for (const card of allCards) {
      if (card.type !== 'TASK') continue;
      const task = card as TaskCard;
      const linkedUserStoryId = task.taskData?.linkedUserStoryId;
      if (!linkedUserStoryId) continue;

      const existing = map.get(linkedUserStoryId) || [];
      existing.push(task);
      map.set(linkedUserStoryId, existing);
    }

    return map;
  }, [allCards]);

  const userStoriesByEpic = useMemo(() => {
    const map = new Map<string, UserStoryCard[]>();

    for (const card of allCards) {
      if (card.type !== 'USER_STORY') continue;
      const story = card as UserStoryCard;
      const linkedEpicId = story.userStoryData?.linkedEpicId;
      if (!linkedEpicId) continue;

      const existing = map.get(linkedEpicId) || [];
      existing.push(story);
      map.set(linkedEpicId, existing);
    }

    return map;
  }, [allCards]);

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
      const connectedStories = userStoriesByEpic.get(epic.id) || [];
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
  }, [epics, userStoriesByEpic]);

  // Calculate done points per planning list
  const listDonePoints = useMemo(() => {
    const donePoints: Record<string, number> = {};

    planningListSections.forEach(list => {
      let points = 0;
      list.userStories.forEach(story => {
        const connectedTasks = tasksByUserStory.get(story.id) || [];
        connectedTasks.forEach((task) => {
          if (task.listId === doneListId) {
            points += task.taskData?.storyPoints ?? 0;
          }
        });
      });
      donePoints[list.id] = points;
    });

    return donePoints;
  }, [planningListSections, doneListId, tasksByUserStory]);

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

  const handlePlanningListsWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-list-cards-scroll="true"]')) {
      return;
    }

    const dominantDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(dominantDelta) < 0.5) return;

    container.scrollLeft += dominantDelta;
    event.preventDefault();
  }, []);

  const cardToListMap = useMemo(() => {
    const map = new Map<string, string>();
    planningListSections.forEach((list) => {
      list.userStories.forEach((card) => {
        map.set(card.id, list.id);
      });
    });
    return map;
  }, [planningListSections]);

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
    const tempId = crypto.randomUUID();
    const tempCard: UserStoryCard = {
      id: tempId,
      type: 'USER_STORY',
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
      userStoryData: { flags: [], linkedEpicId: null },
    };

    // Optimistic: show card immediately
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((list) =>
        list.id === listId ? { ...list, cards: [...list.cards, tempCard] } : list
      ),
    }));

    try {
      const realCard = await mutations.createCard({ title, type: 'USER_STORY', listId });
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
      toast.error('Failed to create user story');
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

  const handleRefreshBoard = useCallback(() => {
    mutations.invalidateBoard();
  }, [mutations]);

  const handleOpenAddModule = useCallback((planningListId?: string) => {
    setModuleDefaultPlanningListId(planningListId);
    setIsAddModuleOpen(true);
  }, []);

  const handleModuleApplied = useCallback((createdCards: Card[]) => {
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((list) => {
        const newCards = createdCards.filter(
          (card) => card.listId === list.id && !list.cards.some((existing) => existing.id === card.id)
        );
        if (newCards.length === 0) return list;
        return { ...list, cards: [...list.cards, ...newCards] };
      }),
    }));
    handleRefreshBoard();
  }, [setBoard, handleRefreshBoard]);

  const handleReleaseStagedTask = useCallback(async (task: TaskCard) => {
    const releaseTargetListId =
      task.taskData?.releaseTargetListId ||
      taskLists.find((list) => list.phase === 'BACKLOG')?.id ||
      taskLists[0]?.id;

    if (!releaseTargetListId) {
      alert('No target Tasks list is available for release.');
      return;
    }

    setReleasingTaskIds((prev) => new Set(prev).add(task.id));

    try {
      const response = await fetch(`/api/boards/${board.id}/cards/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: releaseTargetListId,
          taskData: {
            ...(task.taskData || {}),
            releaseMode: 'IMMEDIATE',
            releaseTargetListId,
            releasedAt: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to release task');
      }

      await handleRefreshBoard();
    } catch (error) {
      console.error('Failed to release staged task:', error);
      alert('Failed to release task. Please try again.');
    } finally {
      setReleasingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }, [board.id, taskLists, handleRefreshBoard]);

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
  }, [board.id, board.lists, setBoard]);

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
        mutations.invalidateBoard();
      }
    } catch (error) {
      console.error('Failed to sync timeline:', error);
      toast.error('Failed to sync timeline');
    } finally {
      setIsSyncingTimeline(false);
    }
  }, [board.id, mutations]);

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

  const qualityTierClass = (tier: ProjectQualitySummary['totals']['overallQualityTier']) => {
    if (tier === 'HIGH') return 'text-success';
    if (tier === 'MEDIUM') return 'text-warning';
    if (tier === 'LOW') return 'text-error';
    return 'text-text-tertiary';
  };

  const confidenceDotClass = (confidence: 'GREEN' | 'AMBER' | 'RED') => {
    if (confidence === 'GREEN') return 'bg-success';
    if (confidence === 'AMBER') return 'bg-warning';
    return 'bg-error';
  };

  const formatWeekStartLabel = (weekStart: string) => {
    const weekDate = new Date(`${weekStart}T00:00:00`);
    return weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Render stats dashboard
  const renderStats = () => (
    <div className={cn(
      'border-b border-border bg-surface transition-all duration-300 overflow-hidden',
      statsExpanded ? 'max-h-[900px]' : 'max-h-10'
    )} style={{ backgroundColor: 'color-mix(in srgb, var(--surface) 80%, transparent)' }}>
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

          {canViewQualitySummaries && (
            <div className="mt-4 rounded-lg border border-border-subtle bg-background p-3">
            <button
              onClick={() => setQualitySummaryExpanded(!qualitySummaryExpanded)}
              className="flex w-full items-center justify-between"
            >
              <div className="flex items-center gap-2 text-caption font-medium text-text-secondary hover:text-text-primary transition-colors">
                {qualitySummaryExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Team Quality Summary
              </div>
              {isLoadingQualitySummary && (
                <div className="text-caption text-text-tertiary">Loading...</div>
              )}
            </button>

            {qualitySummaryExpanded && qualitySummary ? (
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-md border border-border-subtle bg-surface p-2.5">
                    <div className="text-caption text-text-tertiary">Overall</div>
                    <div className={cn('text-title font-semibold mt-1', qualityTierClass(qualitySummary.totals.overallQualityTier))}>
                      {qualitySummary.totals.overallAverage !== null
                        ? qualitySummary.totals.overallAverage.toFixed(2)
                        : 'Unscored'}
                    </div>
                    <div className="text-caption text-text-tertiary">{qualitySummary.totals.overallQualityTier}</div>
                  </div>

                  <div className="rounded-md border border-border-subtle bg-surface p-2.5">
                    <div className="text-caption text-text-tertiary">Coverage</div>
                    <div className="text-title font-semibold mt-1 text-text-primary">
                      {qualitySummary.totals.finalizedTaskCount}/{qualitySummary.totals.doneTaskCount}
                    </div>
                    <div className="text-caption text-text-tertiary">finalized vs done tasks</div>
                  </div>

                  <div className="rounded-md border border-border-subtle bg-surface p-2.5">
                    <div className="text-caption text-text-tertiary">Avg Cycles To Done</div>
                    <div className="text-title font-semibold mt-1 text-text-primary">
                      {qualitySummary.iterationMetrics.averageCyclesToDone !== null
                        ? qualitySummary.iterationMetrics.averageCyclesToDone.toFixed(2)
                        : 'N/A'}
                    </div>
                    <div className="text-caption text-text-tertiary">review loops per finalized task</div>
                  </div>

                  <div className="rounded-md border border-border-subtle bg-surface p-2.5">
                    <div className="text-caption text-text-tertiary">High Churn</div>
                    <div className="text-title font-semibold mt-1 text-text-primary">
                      {qualitySummary.iterationMetrics.highChurnRate !== null
                        ? `${qualitySummary.iterationMetrics.highChurnRate.toFixed(1)}%`
                        : 'N/A'}
                    </div>
                    <div className="text-caption text-text-tertiary">
                      {qualitySummary.iterationMetrics.highChurnCount} tasks with {qualitySummary.iterationMetrics.highChurnThreshold}+ cycles
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-border-subtle bg-surface p-2.5">
                    <div className="mb-2 text-caption font-medium text-text-secondary">Tier Distribution</div>
                    <div className="grid grid-cols-2 gap-2 text-body">
                      <div className="rounded border border-border-subtle px-2 py-1 text-success">
                        High: {qualitySummary.tierDistribution.HIGH}
                      </div>
                      <div className="rounded border border-border-subtle px-2 py-1 text-warning">
                        Medium: {qualitySummary.tierDistribution.MEDIUM}
                      </div>
                      <div className="rounded border border-border-subtle px-2 py-1 text-error">
                        Low: {qualitySummary.tierDistribution.LOW}
                      </div>
                      <div className="rounded border border-border-subtle px-2 py-1 text-text-tertiary">
                        Unscored: {qualitySummary.tierDistribution.UNSCORED}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border border-border-subtle bg-surface p-2.5">
                    <div className="mb-2 text-caption font-medium text-text-secondary">Per Dimension</div>
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {qualitySummary.perDimension.map((dimension) => (
                        <div key={dimension.dimensionId} className="flex items-center justify-between rounded border border-border-subtle px-2 py-1.5">
                          <div className="text-body text-text-primary">{dimension.name}</div>
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2.5 w-2.5 rounded-full', confidenceDotClass(dimension.confidence))} />
                            <span className="text-body font-medium text-text-primary">
                              {dimension.average !== null ? dimension.average.toFixed(2) : 'N/A'}
                            </span>
                            <span className="text-caption text-text-tertiary">n={dimension.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-border-subtle bg-surface p-2.5">
                    <div className="mb-2 text-caption font-medium text-text-secondary">
                      Quality-Adjusted Velocity
                    </div>
                    {qualityAdjustedVelocity ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-caption">
                          <div className="rounded border border-border-subtle px-2 py-1 text-text-secondary">
                            Raw: {qualityAdjustedVelocity.totals.totalRawPoints?.toFixed(2) ?? 'N/A'}
                          </div>
                          <div className="rounded border border-border-subtle px-2 py-1 text-text-secondary">
                            Adjusted: {qualityAdjustedVelocity.totals.totalAdjustedPoints?.toFixed(2) ?? 'N/A'}
                          </div>
                          <div className="rounded border border-border-subtle px-2 py-1 text-text-secondary">
                            Delta: {qualityAdjustedVelocity.totals.totalAdjustmentDelta?.toFixed(2) ?? 'N/A'}
                          </div>
                          <div className="rounded border border-border-subtle px-2 py-1 text-text-secondary">
                            Factor: {qualityAdjustedVelocity.totals.overallAdjustmentFactor?.toFixed(3) ?? 'N/A'}x
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                          {qualityAdjustedVelocity.series.slice(-6).map((bucket) => (
                            <div
                              key={bucket.weekStart}
                              className="flex items-center justify-between rounded border border-border-subtle px-2 py-1 text-caption"
                            >
                              <span className="text-text-tertiary">
                                {formatWeekStartLabel(bucket.weekStart)}
                              </span>
                              <span className="text-text-primary">
                                {bucket.perWeek.rawPoints?.toFixed(1) ?? '0.0'} {'->'} {bucket.perWeek.adjustedPoints?.toFixed(1) ?? '0.0'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-caption text-text-tertiary">Not available.</div>
                    )}
                  </div>

                  <div className="rounded-md border border-border-subtle bg-surface p-2.5">
                    <div className="mb-2 text-caption font-medium text-text-secondary">
                      Iteration Distribution
                    </div>
                    {iterationDistribution ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-caption mb-2">
                          <div className="rounded border border-border-subtle px-2 py-1 text-text-secondary">
                            With cycles: {iterationDistribution.totals.withReviewCyclesCount}
                          </div>
                          <div className="rounded border border-border-subtle px-2 py-1 text-text-secondary">
                            No cycles: {iterationDistribution.totals.withoutReviewCyclesCount}
                          </div>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {iterationDistribution.distribution.map((bucket) => (
                            <div
                              key={bucket.cycleCount}
                              className="flex items-center justify-between rounded border border-border-subtle px-2 py-1.5"
                            >
                              <span className="text-caption text-text-tertiary">
                                {bucket.cycleCount} cycle{bucket.cycleCount === 1 ? '' : 's'}
                              </span>
                              <span className="text-caption text-text-primary">
                                {bucket.taskCount} tasks ({bucket.percentage !== null ? `${bucket.percentage.toFixed(1)}%` : 'N/A'})
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-caption text-text-tertiary">Not available.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : qualitySummaryExpanded ? (
              <div className="text-body text-text-tertiary mt-3">
                {isLoadingQualitySummary ? 'Loading quality data...' : 'Quality summary is not available yet.'}
              </div>
            ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Render epics sidebar
  const renderEpicsSidebar = () => (
    <div
      className="w-[280px] shrink-0 border-r border-border bg-surface flex flex-col"
      style={{ backgroundColor: 'color-mix(in srgb, var(--surface) 80%, transparent)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-card-epic" />
          <span className="text-title font-semibold">Epics</span>
          <span className="text-caption text-text-tertiary">{epics.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-text-tertiary hover:text-text-primary"
            onClick={() => handleOpenAddModule()}
            title="Add module"
          >
            <Boxes className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-text-tertiary hover:text-text-primary"
            onClick={() => setIsAddingEpic(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
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

  const renderPlanningListColumn = (list: PlanningListSection) => (
    <ListComponent
      key={list.id}
      id={list.id}
      name={list.name}
      cards={list.userStories}
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
      useTwoRowHeaderActions
      extraHeaderActions={(
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-text-tertiary hover:text-text-primary"
          onClick={() => handleOpenAddModule(list.id)}
          title="Add module"
        >
          <Boxes className="h-4 w-4" />
        </Button>
      )}
      secondaryCards={list.stagedTasks}
      secondarySectionTitle="Staged Tasks"
      secondaryEmptyText="No staged tasks in this phase."
      renderSecondaryCardActions={(card) => {
        const task = card as TaskCard;
        const isReleasing = releasingTaskIds.has(task.id);
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-caption"
            disabled={isReleasing}
            onClick={(event) => {
              event.stopPropagation();
              void handleReleaseStagedTask(task);
            }}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {isReleasing ? 'Releasing...' : 'Release now'}
          </Button>
        );
      }}
    />
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
            <div
              className="flex-1 flex items-start gap-4 overflow-x-auto p-4"
              onWheel={handlePlanningListsWheel}
            >
              {planningListSections.map((list) => renderPlanningListColumn(list))}
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
          <div
            className="flex-1 flex items-start gap-4 overflow-x-auto p-4"
            onWheel={handlePlanningListsWheel}
          >
            {planningListSections.map((list) => (
              <SortableContext
                key={list.id}
                  items={list.userStories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {renderPlanningListColumn(list)}
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
        onLinkedCardCreated={handleLinkedCardCreated}
        onCardClick={setSelectedCard}
        currentUserId={currentUserId}
        canViewQualitySummaries={canViewQualitySummaries}
        taskLists={taskLists}
        planningLists={planningLists}
        allCards={allCards}
      />

      <AddModuleToBoardModal
        isOpen={isAddModuleOpen}
        onClose={() => setIsAddModuleOpen(false)}
        boardId={board.id}
        planningLists={planningLists}
        taskLists={taskLists}
        defaultPlanningListId={moduleDefaultPlanningListId}
        onApplied={handleModuleApplied}
      />
    </div>
  );
}
