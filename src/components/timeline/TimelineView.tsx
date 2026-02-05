'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TimelineHeader } from './TimelineHeader';
import { CreateProjectDialog } from './CreateProjectDialog';
import { TimelineDateHeader } from './TimelineDateHeader';
import { TimelineLeftColumn } from './TimelineLeftColumn';
import { TimelineEventsRow } from './TimelineEventsRow';
import { TimelineBlocksRow } from './TimelineBlocksRow';
import { TimelineFilterPanel } from './TimelineFilterPanel';
import { BlockEditModal } from './BlockEditModal';
import { AddBlockDialog } from './AddBlockDialog';
import { EventEditModal } from './EventEditModal';
import { TimelineRoleRow } from './TimelineRoleRow';
import { WeekAvailabilityPopup } from './WeekAvailabilityPopup';
import type {
  TimelineData,
  BlockType,
  EventType,
  TimelineBlock,
  TimelineEvent as TimelineEventType,
  Team,
  User,
  TimelineMember,
  UserWeeklyAvailability,
} from '@/types';
import { getMonday, getFriday, addBusinessDays } from '@/lib/date-utils';

// Minimal user info needed for timeline display
type TimelineUser = Pick<User, 'id' | 'name' | 'email' | 'image'>;

interface TimelineFilters {
  teams: string[];
  users: string[];
  blockTypes: string[];
  eventTypes: string[];
}

interface TimelineViewProps {
  projects: TimelineData[];
  teams: Team[];
  users: TimelineUser[];
  blockTypes: BlockType[];
  eventTypes: EventType[];
  isAdmin: boolean;
  openCreateDialog?: boolean;
}

// Constants for layout - fixed values for consistent alignment
const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 72; // Fixed: Month row (~28px) + Week row (~20px) + Day row (~24px)
const COLUMN_WIDTH = 32; // Fixed column width for day view
const WEEKS_TO_SHOW = 8; // Show 8 weeks (40 business days)

export function TimelineView({
  projects: initialProjects,
  teams,
  users,
  blockTypes,
  eventTypes,
  isAdmin,
  openCreateDialog = false,
}: TimelineViewProps) {
  // Local state for optimistic updates
  const [projects, setProjects] = useState(initialProjects);

  // Sync with server data when it changes
  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  // State
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    // Start from beginning of current week (Monday)
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    today.setDate(diff);
    return today;
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TimelineFilters>({
    teams: [],
    users: [],
    blockTypes: [],
    eventTypes: [],
  });
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedBlockId, setSelectedBlockId] = useState<string>();
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [createProjectStartDate, setCreateProjectStartDate] = useState<Date | undefined>();
  const [editingBlock, setEditingBlock] = useState<TimelineBlock | null>(null);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [addBlockBoardId, setAddBlockBoardId] = useState<string>('');
  const [addBlockStartDate, setAddBlockStartDate] = useState<Date | undefined>();
  const [insertBeforeBlockId, setInsertBeforeBlockId] = useState<string | null>(null);

  // Event editing state
  const [editingEvent, setEditingEvent] = useState<TimelineEventType | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventBoardId, setEventBoardId] = useState<string>('');
  const [eventDefaultDate, setEventDefaultDate] = useState<Date | undefined>();

  // Availability editing state
  const [showAvailabilityPopup, setShowAvailabilityPopup] = useState(false);
  const [availabilityWeekStart, setAvailabilityWeekStart] = useState<Date | null>(null);
  const [availabilityRoleId, setAvailabilityRoleId] = useState<string>('');
  const [availabilityRoleName, setAvailabilityRoleName] = useState<string>('');
  const [availabilityRoleColor, setAvailabilityRoleColor] = useState<string | null>(null);
  const [availabilityMembers, setAvailabilityMembers] = useState<TimelineMember[]>([]);
  const [availabilityExisting, setAvailabilityExisting] = useState<UserWeeklyAvailability[]>([]);
  const [availabilityBoardId, setAvailabilityBoardId] = useState<string>('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Open create dialog if requested via prop (e.g., from Boards page)
  useEffect(() => {
    if (openCreateDialog) {
      setShowCreateProject(true);
      // Clear the URL param without triggering a reload
      window.history.replaceState({}, '', '/timeline');
    }
  }, [openCreateDialog]);

  // Calculate date range - fixed 8 weeks
  const { startDate, endDate, totalDays } = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    end.setDate(end.getDate() + WEEKS_TO_SHOW * 7);

    // Count business days
    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return { startDate: start, endDate: end, totalDays: days };
  }, [currentDate]);

  // Filter projects based on filters
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Team filter
      if (filters.teams.length > 0) {
        if (!project.board.teamId || !filters.teams.includes(project.board.teamId)) {
          return false;
        }
      }

      // Block type filter
      if (filters.blockTypes.length > 0) {
        const hasMatchingBlock = project.blocks.some((block) =>
          filters.blockTypes.includes(block.blockType.id)
        );
        if (!hasMatchingBlock) return false;
      }

      // Event type filter
      if (filters.eventTypes.length > 0) {
        const hasMatchingEvent = project.events.some((event) =>
          filters.eventTypes.includes(event.eventType.id)
        );
        if (!hasMatchingEvent) return false;
      }

      return true;
    });
  }, [projects, filters]);

  // Transform projects for left column
  const projectRows = useMemo(() => {
    return filteredProjects.map((project) => {
      // Use board members (all users who are members of the board)
      const boardMembers = project.board.members || [];

      return {
        id: project.board.id,
        name: project.board.name,
        teamColor: project.board.team?.color,
        teamName: project.board.team?.name,
        isExpanded: expandedProjects.has(project.board.id),
        members: boardMembers,
        hasEvents: project.events.length > 0,
      };
    });
  }, [filteredProjects, expandedProjects]);

  // Handlers
  const handleToggleProject = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const handleTodayClick = useCallback(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    today.setDate(diff);
    setCurrentDate(today);
  }, []);

  const handleBlockClick = useCallback((block: TimelineBlock) => {
    setSelectedBlockId(block.id);
    setSelectedEventId(undefined);
    if (isAdmin) {
      setEditingBlock(block);
    }
  }, [isAdmin]);

  const handleEventClick = useCallback((event: TimelineEventType, boardId: string) => {
    setSelectedEventId(event.id);
    setSelectedBlockId(undefined);
    if (isAdmin) {
      setEditingEvent(event);
      setEventBoardId(boardId);
      setShowEventModal(true);
    }
  }, [isAdmin]);

  const handleEventEdit = useCallback((event: TimelineEventType, boardId: string) => {
    setEditingEvent(event);
    setEventBoardId(boardId);
    setShowEventModal(true);
  }, []);

  const handleEventDelete = useCallback(async (event: TimelineEventType, boardId: string) => {
    if (!confirm(`Delete event "${event.title}"?`)) return;

    try {
      const response = await fetch(`/api/boards/${boardId}/timeline/events/${event.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  }, [router]);

  const handleAddEvent = useCallback((boardId: string, date?: Date) => {
    setEditingEvent(null);
    setEventBoardId(boardId);
    setEventDefaultDate(date);
    setShowEventModal(true);
  }, []);

  const handleEventSave = useCallback(async (
    eventId: string | null,
    data: {
      title: string;
      description?: string | null;
      eventTypeId: string;
      startDate: string;
      endDate: string;
    }
  ) => {
    if (eventId) {
      // Update existing event
      const response = await fetch(`/api/boards/${eventBoardId}/timeline/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }
    } else {
      // Create new event
      const response = await fetch(`/api/boards/${eventBoardId}/timeline/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }
    }

    router.refresh();
  }, [eventBoardId, router]);

  const handleEventModalDelete = useCallback(async (eventId: string) => {
    const response = await fetch(`/api/boards/${eventBoardId}/timeline/events/${eventId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete event');
    }

    router.refresh();
  }, [eventBoardId, router]);

  const handleCloseEventModal = useCallback(() => {
    setShowEventModal(false);
    setEditingEvent(null);
    setEventBoardId('');
    setEventDefaultDate(undefined);
  }, []);

  // Handle opening availability popup
  const handleOpenAvailabilityPopup = useCallback((
    boardId: string,
    weekStart: Date,
    roleId: string,
    roleMembers: TimelineMember[]
  ) => {
    const project = projects.find(p => p.board.id === boardId);
    if (!project) return;

    // Find role info from members
    const roleMember = roleMembers[0];
    const role = roleMember?.userCompanyRoles.find(ucr => ucr.companyRole.id === roleId)?.companyRole;

    // Get existing availability for this week and these members
    const weekKey = getMonday(weekStart).toISOString().split('T')[0];
    const existingForWeek = project.availability.filter(a => {
      const availWeekKey = getMonday(new Date(a.weekStart)).toISOString().split('T')[0];
      return availWeekKey === weekKey && roleMembers.some(m => m.id === a.userId);
    });

    setAvailabilityBoardId(boardId);
    setAvailabilityWeekStart(weekStart);
    setAvailabilityRoleId(roleId);
    setAvailabilityRoleName(role?.name || 'Unknown Role');
    setAvailabilityRoleColor(role?.color || null);
    setAvailabilityMembers(roleMembers);
    setAvailabilityExisting(existingForWeek);
    setShowAvailabilityPopup(true);
  }, [projects]);

  // Handle closing availability popup
  const handleCloseAvailabilityPopup = useCallback(() => {
    setShowAvailabilityPopup(false);
    setAvailabilityWeekStart(null);
    setAvailabilityRoleId('');
    setAvailabilityRoleName('');
    setAvailabilityRoleColor(null);
    setAvailabilityMembers([]);
    setAvailabilityExisting([]);
    setAvailabilityBoardId('');
  }, []);

  // Handle saving availability
  const handleSaveAvailability = useCallback(async (
    boardId: string,
    entries: { userId: string; weekStart: string; dedication: number }[]
  ) => {
    const response = await fetch(`/api/boards/${boardId}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });

    if (!response.ok) {
      throw new Error('Failed to save availability');
    }

    router.refresh();
  }, [router]);

  // Handle event move (drag-and-drop day-by-day)
  const handleEventMove = useCallback(async (eventId: string, daysDelta: number, boardId: string) => {
    if (daysDelta === 0) return;

    // Find the event from current projects (for date calculation only)
    const project = projects.find(p => p.events.some(e => e.id === eventId));
    if (!project) return;
    const event = project.events.find(e => e.id === eventId);
    if (!event) return;

    // Calculate new dates (add business days)
    const addBusinessDays = (date: Date, days: number): Date => {
      const result = new Date(date);
      let remaining = Math.abs(days);
      const direction = days > 0 ? 1 : -1;

      while (remaining > 0) {
        result.setDate(result.getDate() + direction);
        const dayOfWeek = result.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          remaining--;
        }
      }
      return result;
    };

    const newStartDate = addBusinessDays(new Date(event.startDate), daysDelta);
    const newEndDate = addBusinessDays(new Date(event.endDate), daysDelta);

    // Optimistic update - use boardId to find project inside updater to avoid stale closure
    setProjects(prev => {
      const idx = prev.findIndex(p => p.board.id === boardId);
      if (idx === -1) return prev;
      const updated = [...prev];
      const projectCopy = { ...updated[idx], events: [...updated[idx].events] };
      projectCopy.events = projectCopy.events.map(e => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          startDate: newStartDate.toISOString(),
          endDate: newEndDate.toISOString(),
        };
      });
      updated[idx] = projectCopy;
      return updated;
    });

    // Fire and forget - API call in background
    try {
      const response = await fetch(`/api/boards/${boardId}/timeline/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: newStartDate.toISOString().split('T')[0],
          endDate: newEndDate.toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to move event:', error);
      router.refresh();
    }
  }, [projects, router]);

  const handleCreateProject = useCallback(() => {
    setCreateProjectStartDate(undefined);
    setShowCreateProject(true);
  }, []);

  const handleCloseCreateProject = useCallback(() => {
    setShowCreateProject(false);
    setCreateProjectStartDate(undefined);
  }, []);

  // Block group move handler (for drag-and-drop)
  // Moves multiple blocks by a number of weeks (each week = 5 business days)
  // Also moves events that fall within the blocks' date range
  // Pushes stationary blocks out of the way to prevent stacking
  const handleBlockGroupMove = useCallback(async (
    blockIds: string[],
    weeksDelta: number
  ) => {
    if (blockIds.length === 0 || weeksDelta === 0) return;

    // Find the board that contains these blocks
    const firstBlockId = blockIds[0];
    const projectIndex = projects.findIndex(p => p.blocks.some(b => b.id === firstBlockId));
    if (projectIndex === -1) return;
    const project = projects[projectIndex];
    const boardId = project.board.id;

    // Helper: get week key (Monday date string) for a block's start date
    const _getWeekKey = (startDate: string): string => {
      const monday = getMonday(new Date(startDate));
      return monday.toISOString().split('T')[0];
    };

    // Compute new week key for a block after applying a delta
    const computeNewWeekKey = (blockStartDate: string, delta: number): string => {
      const currentMonday = getMonday(new Date(blockStartDate));
      const newMonday = new Date(currentMonday);
      newMonday.setDate(newMonday.getDate() + delta * 7);
      return newMonday.toISOString().split('T')[0];
    };

    // Build per-block delta map: blockId -> weeksDelta
    const blockDeltas = new Map<string, number>();

    // All explicitly dragged blocks get the drag delta
    for (const id of blockIds) {
      blockDeltas.set(id, weeksDelta);
    }

    // Resolve collisions: push stationary blocks that would overlap
    // Sort blocks in the direction of movement so we process pushes correctly
    const direction = weeksDelta > 0 ? 1 : -1;
    const allBlocks = [...project.blocks].sort((a, b) => {
      const diff = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      return direction > 0 ? -diff : diff; // Reverse order when moving right
    });

    // Iterate until stable (max = block count iterations for safety)
    for (let pass = 0; pass < allBlocks.length; pass++) {
      let changed = false;

      // Build occupied weeks map from current deltas
      const occupiedWeeks = new Map<string, string>(); // weekKey -> blockId
      for (const block of allBlocks) {
        const delta = blockDeltas.get(block.id) ?? 0;
        const weekKey = computeNewWeekKey(block.startDate, delta);
        occupiedWeeks.set(block.id, weekKey);
      }

      // Check each stationary block for collision with any other block
      for (const block of allBlocks) {
        const blockDelta = blockDeltas.get(block.id) ?? 0;
        const blockWeek = computeNewWeekKey(block.startDate, blockDelta);

        for (const other of allBlocks) {
          if (block.id === other.id) continue;
          const otherDelta = blockDeltas.get(other.id) ?? 0;
          const otherWeek = computeNewWeekKey(other.startDate, otherDelta);

          if (blockWeek === otherWeek) {
            // Collision! Push the block that is NOT in the original drag set
            // If both are dragged, or neither, push the one further in the direction of movement
            const blockIsDragged = blockIds.includes(block.id);
            const otherIsDragged = blockIds.includes(other.id);

            let toPush: typeof block | null = null;
            if (!blockIsDragged && otherIsDragged) {
              toPush = block;
            } else if (blockIsDragged && !otherIsDragged) {
              toPush = other;
            } else {
              // Both dragged or both stationary - push the one further in movement direction
              const blockStart = new Date(block.startDate).getTime();
              const otherStart = new Date(other.startDate).getTime();
              toPush = (direction > 0)
                ? (otherStart >= blockStart ? other : block)
                : (otherStart <= blockStart ? other : block);
              // Don't push originally dragged blocks
              if (blockIds.includes(toPush.id)) continue;
            }

            if (toPush) {
              const currentDelta = blockDeltas.get(toPush.id) ?? 0;
              blockDeltas.set(toPush.id, currentDelta + direction);
              changed = true;
            }
          }
        }
      }

      if (!changed) break;
    }

    // Collect all block IDs that need to move (including pushed blocks)
    const allBlockIdsToMove: string[] = [];
    const allBlockWeeksDeltas = new Map<string, number>();
    for (const [id, delta] of blockDeltas) {
      if (delta !== 0) {
        allBlockIdsToMove.push(id);
        allBlockWeeksDeltas.set(id, delta);
      }
    }

    // Find events that fall within the DRAGGED blocks' date range
    const draggedBlocks = project.blocks.filter(b => blockIds.includes(b.id));
    const draggedStartDates = draggedBlocks.map(b => new Date(b.startDate).getTime());
    const draggedEndDates = draggedBlocks.map(b => new Date(b.endDate).getTime());
    const draggedRangeStart = draggedStartDates.length > 0 ? Math.min(...draggedStartDates) : 0;
    const draggedRangeEnd = draggedEndDates.length > 0 ? Math.max(...draggedEndDates) : 0;

    const eventsToMove = project.events.filter(e => {
      const eventStart = new Date(e.startDate).getTime();
      return eventStart >= draggedRangeStart && eventStart <= draggedRangeEnd;
    });
    const eventIdsToMove = eventsToMove.map(e => e.id);
    const businessDaysDelta = weeksDelta * 5;

    // Optimistic update - update local state immediately
    // Use prev => to avoid stale closure issues with projectIndex
    setProjects(prev => {
      const idx = prev.findIndex(p => p.board.id === boardId);
      if (idx === -1) return prev;

      const updated = [...prev];
      const projectCopy = {
        ...updated[idx],
        blocks: [...updated[idx].blocks],
        events: [...updated[idx].events],
      };

      // Move all blocks (dragged + pushed)
      projectCopy.blocks = projectCopy.blocks.map(block => {
        const delta = allBlockWeeksDeltas.get(block.id);
        if (delta === undefined) return block;

        const currentMonday = getMonday(new Date(block.startDate));
        const newMonday = new Date(currentMonday);
        newMonday.setDate(newMonday.getDate() + delta * 7);
        const newFriday = getFriday(newMonday);

        return {
          ...block,
          startDate: newMonday.toISOString(),
          endDate: newFriday.toISOString(),
        };
      });

      // Move events (only those in the dragged blocks' range)
      projectCopy.events = projectCopy.events.map(event => {
        if (!eventIdsToMove.includes(event.id)) return event;

        const newStartDate = addBusinessDays(new Date(event.startDate), businessDaysDelta);
        const newEndDate = addBusinessDays(new Date(event.endDate), businessDaysDelta);

        return {
          ...event,
          startDate: newStartDate.toISOString(),
          endDate: newEndDate.toISOString(),
        };
      });

      updated[idx] = projectCopy;
      return updated;
    });

    // Build per-block weeksDelta map for the API
    const blockMoves: { id: string; weeksDelta: number }[] = [];
    for (const [id, delta] of allBlockWeeksDeltas) {
      blockMoves.push({ id, weeksDelta: delta });
    }

    // Fire and forget - API call in background
    try {
      const response = await fetch(`/api/boards/${boardId}/timeline/blocks/move-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockIds: allBlockIdsToMove,
          weeksDelta,
          blockMoves,
          eventIds: eventIdsToMove,
          syncToList: true,
        }),
      });

      if (!response.ok) {
        // Revert on error by refreshing
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to move blocks:', error);
      router.refresh();
    }
  }, [projects, router]);

  // Block delete handler (from context menu)
  // Deletes a block and shifts all blocks to the right of it left by one week
  const handleBlockDelete = useCallback(async (block: TimelineBlock) => {
    const project = projects.find(p => p.blocks.some(b => b.id === block.id));
    if (!project) return;

    if (!confirm(`Delete timeline block "${block.blockType.name} ${block.position}"? Blocks to the right will shift left.`)) {
      return;
    }

    try {
      // Use the delete-and-shift endpoint
      const response = await fetch(`/api/boards/${project.board.id}/timeline/blocks/${block.id}/delete-and-shift`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncToList: true,
        }),
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to delete block:', error);
    }
  }, [projects, router]);

  // Block edit modal save handler
  const handleBlockSave = useCallback(async (
    blockId: string,
    updates: {
      startDate?: string;
      endDate?: string;
      blockTypeId?: string;
      listId?: string | null;
      syncToList?: boolean;
    }
  ) => {
    const project = projects.find(p => p.blocks.some(b => b.id === blockId));
    if (!project) return;

    const response = await fetch(`/api/boards/${project.board.id}/timeline/blocks/${blockId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update block');
    }

    router.refresh();
  }, [projects, router]);

  // Block delete from modal handler
  const handleBlockDeleteFromModal = useCallback(async (blockId: string) => {
    const project = projects.find(p => p.blocks.some(b => b.id === blockId));
    if (!project) return;

    const response = await fetch(`/api/boards/${project.board.id}/timeline/blocks/${blockId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete block');
    }

    router.refresh();
  }, [projects, router]);

  // Add block handler
  const handleAddBlock = useCallback((boardId: string, blockStartDate?: Date) => {
    setAddBlockBoardId(boardId);
    setAddBlockStartDate(blockStartDate);
    setShowAddBlock(true);
  }, []);

  // Insert block handler (shifts blocks to the right)
  const handleBlockInsert = useCallback(async (atBlock: TimelineBlock) => {
    const project = projects.find(p => p.blocks.some(b => b.id === atBlock.id));
    if (!project) return;

    // Set up the add block dialog with the target block's start date
    // The API will handle shifting blocks to the right
    setAddBlockBoardId(project.board.id);
    setAddBlockStartDate(new Date(atBlock.startDate));
    setShowAddBlock(true);
    // Store the block to insert before
    setInsertBeforeBlockId(atBlock.id);
  }, [projects]);

  // Create block handler
  const handleCreateBlock = useCallback(async (data: {
    blockTypeId: string;
    startDate: string;
    endDate: string;
    listId?: string;
    createList?: boolean;
  }) => {
    // If inserting before a block, use the insert endpoint
    if (insertBeforeBlockId) {
      const response = await fetch(`/api/boards/${addBlockBoardId}/timeline/blocks/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          insertBeforeBlockId,
          syncToList: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to insert block');
      }
    } else {
      const response = await fetch(`/api/boards/${addBlockBoardId}/timeline/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create block');
      }
    }

    router.refresh();
  }, [addBlockBoardId, insertBeforeBlockId, router]);

  // Close add block dialog
  const handleCloseAddBlock = useCallback(() => {
    setShowAddBlock(false);
    setAddBlockBoardId('');
    setAddBlockStartDate(undefined);
    setInsertBeforeBlockId(null);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Timeline Header with controls */}
      <TimelineHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onTodayClick={handleTodayClick}
        onFilterToggle={() => setShowFilters(!showFilters)}
        showFilters={showFilters}
        onCreateProject={handleCreateProject}
        isAdmin={isAdmin}
      />

      {/* Create Project Dialog */}
      <CreateProjectDialog
        isOpen={showCreateProject}
        onClose={handleCloseCreateProject}
        defaultStartDate={createProjectStartDate}
        teams={teams}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timeline container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left column - Project names */}
          <TimelineLeftColumn
            projects={projectRows}
            onToggleProject={handleToggleProject}
            onAddBlock={(projectId) => handleAddBlock(projectId)}
            onAddEvent={(projectId) => handleAddEvent(projectId)}
            rowHeight={ROW_HEIGHT}
            eventRowHeight={28}
            roleRowHeight={32}
            headerHeight={HEADER_HEIGHT}
            isAdmin={isAdmin}
          />

          {/* Scrollable grid area */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-auto"
          >
            {/* Grid container - ensure it fills viewport or content width, whichever is larger */}
            <div
              className="flex flex-col bg-background"
              style={{ minWidth: `max(100%, ${totalDays * COLUMN_WIDTH}px)` }}
            >
              {/* Date header */}
              <TimelineDateHeader
                startDate={startDate}
                endDate={endDate}
                columnWidth={COLUMN_WIDTH}
              />

              {/* Project rows */}
              <div>
              {filteredProjects.map((project) => {
                // Row height for events (smaller)
                const EVENT_ROW_HEIGHT = 28;

                return (
                  <div key={project.board.id}>
                    {/* Events row (separate row above blocks) */}
                    <TimelineEventsRow
                      events={project.events}
                      startDate={startDate}
                      columnWidth={COLUMN_WIDTH}
                      rowHeight={EVENT_ROW_HEIGHT}
                      onEventClick={(event) => handleEventClick(event, project.board.id)}
                      onEventEdit={(event) => handleEventEdit(event, project.board.id)}
                      onEventDelete={(event) => handleEventDelete(event, project.board.id)}
                      onAddEvent={(date) => handleAddEvent(project.board.id, date)}
                      onEventMove={(eventId, daysDelta) => handleEventMove(eventId, daysDelta, project.board.id)}
                      selectedEventId={selectedEventId}
                      totalColumns={totalDays}
                      isAdmin={isAdmin}
                    />

                    {/* Blocks row */}
                    <TimelineBlocksRow
                      blocks={project.blocks}
                      startDate={startDate}
                      columnWidth={COLUMN_WIDTH}
                      rowHeight={ROW_HEIGHT}
                      onBlockClick={handleBlockClick}
                      onBlockGroupMove={handleBlockGroupMove}
                      onBlockDelete={handleBlockDelete}
                      onBlockInsert={handleBlockInsert}
                      selectedBlockId={selectedBlockId}
                      totalColumns={totalDays}
                      isAdmin={isAdmin}
                    />

                    {/* Role-based availability rows */}
                    {(() => {
                      // Get unique roles from project members, sorted by position
                      const rolesMap = new Map<string, { id: string; name: string; color: string | null; position: number }>();
                      project.board.members.forEach(member => {
                        member.userCompanyRoles.forEach(ucr => {
                          if (!rolesMap.has(ucr.companyRole.id)) {
                            rolesMap.set(ucr.companyRole.id, ucr.companyRole);
                          }
                        });
                      });
                      const uniqueRoles = Array.from(rolesMap.values()).sort((a, b) => a.position - b.position);

                      return uniqueRoles.map(role => (
                        <TimelineRoleRow
                          key={`${project.board.id}-${role.id}`}
                          role={role}
                          members={project.board.members}
                          availability={project.availability}
                          boardId={project.board.id}
                          startDate={startDate}
                          endDate={endDate}
                          columnWidth={COLUMN_WIDTH}
                          rowHeight={32}
                          onWeekClick={(weekStart, roleId, roleMembers) =>
                            handleOpenAvailabilityPopup(project.board.id, weekStart, roleId, roleMembers)
                          }
                          isAdmin={isAdmin}
                        />
                      ));
                    })()}
                  </div>
                );
              })}

              {filteredProjects.length === 0 && (
                <div className="flex items-center justify-center py-24 text-text-tertiary min-w-full">
                  <div className="text-center">
                    <p className="text-body">No projects match the current filters</p>
                    <p className="text-caption mt-1">
                      Try adjusting your filters or create timeline blocks for your boards.
                    </p>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <TimelineFilterPanel
            teams={teams}
            users={users}
            blockTypes={blockTypes}
            eventTypes={eventTypes}
            filters={filters}
            onFiltersChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        )}
      </div>

      {/* Block Edit Modal */}
      {editingBlock && (
        <BlockEditModal
          block={editingBlock}
          boardId={projects.find(p => p.blocks.some(b => b.id === editingBlock.id))?.board.id || ''}
          blockTypes={blockTypes}
          lists={[]}
          users={users}
          isOpen={!!editingBlock}
          onClose={() => setEditingBlock(null)}
          onSave={handleBlockSave}
          onDelete={handleBlockDeleteFromModal}
        />
      )}

      {/* Add Block Dialog */}
      {showAddBlock && (
        <AddBlockDialog
          boardId={addBlockBoardId}
          blockTypes={blockTypes}
          lists={[]}
          isOpen={showAddBlock}
          onClose={handleCloseAddBlock}
          onCreate={handleCreateBlock}
          defaultStartDate={addBlockStartDate}
        />
      )}

      {/* Event Edit Modal */}
      <EventEditModal
        event={editingEvent}
        boardId={eventBoardId}
        eventTypes={eventTypes}
        isOpen={showEventModal}
        onClose={handleCloseEventModal}
        onSave={handleEventSave}
        onDelete={handleEventModalDelete}
        defaultDate={eventDefaultDate}
      />

      {/* Week Availability Popup */}
      {showAvailabilityPopup && availabilityWeekStart && (
        <WeekAvailabilityPopup
          isOpen={showAvailabilityPopup}
          onClose={handleCloseAvailabilityPopup}
          weekStart={availabilityWeekStart}
          roleId={availabilityRoleId}
          roleName={availabilityRoleName}
          roleColor={availabilityRoleColor}
          members={availabilityMembers}
          existingAvailability={availabilityExisting}
          boardId={availabilityBoardId}
          onSave={handleSaveAvailability}
        />
      )}
    </div>
  );
}
