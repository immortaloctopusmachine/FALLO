'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Flag, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TimelineHeader } from './TimelineHeader';
import { CreateProjectDialog } from './CreateProjectDialog';
import { TimelineDateHeader } from './TimelineDateHeader';
import { TimelineEventsRow } from './TimelineEventsRow';
import { TimelineBlocksRow } from './TimelineBlocksRow';
import { TimelineFilterPanel } from './TimelineFilterPanel';
import { BlockEditModal } from './BlockEditModal';
import { AddBlockDialog } from './AddBlockDialog';
import { EventEditModal } from './EventEditModal';
import { TimelineUserAvailabilityRow } from './TimelineUserAvailabilityRow';
import { WeekAvailabilityPopup } from './WeekAvailabilityPopup';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api-client';
import { getProjectDisplayName } from '@/lib/project-utils';
import type {
  TimelineData,
  TimelineArchivedProjectSummary,
  BlockType,
  EventType,
  TimelineBlock,
  TimelineEvent as TimelineEventType,
  Team,
  User,
  TimelineMember,
  UserWeeklyAvailability,
} from '@/types';
import { getMonday, getFriday, addBusinessDays, formatLocalDateKey } from '@/lib/date-utils';

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
  archivedProjects: TimelineArchivedProjectSummary[];
  teams: Team[];
  users: TimelineUser[];
  blockTypes: BlockType[];
  eventTypes: EventType[];
  isAdmin: boolean;
  openCreateDialog?: boolean;
}

// Constants for layout - fixed values for consistent alignment
const ROW_HEIGHT = 48;
const EVENT_ROW_HEIGHT = 28;
const USER_ROW_HEIGHT = 28;
const COLUMN_WIDTH = 32; // Fixed column width for day view
const WEEKS_TO_SHOW = 8; // Show 8 weeks (40 business days)
const RANGE_LEFT_PADDING_DAYS = 5;
const RANGE_RIGHT_PADDING_DAYS = 5;
const LEFT_COLUMN_WIDTH = 376;
const ARCHIVED_SECTION_HEADER_HEIGHT = 24;
const COLLAPSED_PROJECTS_STORAGE_KEY = 'timeline.collapsedProjectIds';
const SHOW_BLOCK_INFO_STORAGE_KEY = 'timeline.showBlockInfo.v2';
type TimelineDisplayRow = {
  id: string;
  userId: string;
  member: TimelineMember;
  roles: {
    id: string;
    name: string;
    color: string | null;
  }[];
};

interface BlockDeleteListOption {
  id: string;
  name: string;
  position: number;
}

interface BlockDeleteOptions {
  blockId: string;
  linkedList: { id: string; name: string } | null;
  cardCount: number;
  availableLists: BlockDeleteListOption[];
  recommendedListId: string | null;
  requiresCardDeletion: boolean;
}

export function TimelineView({
  projects: initialProjects,
  archivedProjects: initialArchivedProjects,
  teams,
  users,
  blockTypes,
  eventTypes,
  isAdmin,
  openCreateDialog = false,
}: TimelineViewProps) {
  const getTeamTint = useCallback((color: string | null | undefined, alpha = '12') => {
    if (!color) return 'var(--surface)';
    if (color.startsWith('#') && color.length === 7) {
      return `${color}${alpha}`;
    }
    return 'var(--surface)';
  }, []);

  // Local state for optimistic updates
  const [projects, setProjects] = useState(initialProjects);
  const [archivedProjects, setArchivedProjects] = useState(initialArchivedProjects);

  // Sync with server data when it changes
  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);
  useEffect(() => {
    setArchivedProjects(initialArchivedProjects);
  }, [initialArchivedProjects]);

  // State
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Center "today" in the visible business-day window.
    const centeredStart = addBusinessDays(today, -Math.floor((WEEKS_TO_SHOW * 5) / 2));

    // Snap to start of week (Monday) for cleaner month/week headers.
    const day = centeredStart.getDay();
    const diff = centeredStart.getDate() - day + (day === 0 ? -6 : 1);
    centeredStart.setDate(diff);
    return centeredStart;
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TimelineFilters>({
    teams: [],
    users: [],
    blockTypes: [],
    eventTypes: [],
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string>();
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [showBlockInfo, setShowBlockInfo] = useState(false);
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<Set<string>>(
    () => new Set(initialProjects.map((project) => project.board.id))
  );
  const [userContextMenu, setUserContextMenu] = useState<{
    userId: string;
    x: number;
    y: number;
  } | null>(null);
  const [projectContextMenu, setProjectContextMenu] = useState<{
    projectId: string;
    x: number;
    y: number;
  } | null>(null);
  const [archivedProjectContextMenu, setArchivedProjectContextMenu] = useState<{
    projectId: string;
    x: number;
    y: number;
  } | null>(null);
  const [loadingArchivedProjectId, setLoadingArchivedProjectId] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [createProjectStartDate, setCreateProjectStartDate] = useState<Date | undefined>();
  const [editingBlock, setEditingBlock] = useState<TimelineBlock | null>(null);
  const [pendingDeleteBlock, setPendingDeleteBlock] = useState<TimelineBlock | null>(null);
  const [deleteOptions, setDeleteOptions] = useState<BlockDeleteOptions | null>(null);
  const [deleteDestinationListId, setDeleteDestinationListId] = useState<string>('');
  const [deleteCardsInstead, setDeleteCardsInstead] = useState(false);
  const [isDeletingBlock, setIsDeletingBlock] = useState(false);
  const [isLoadingDeleteOptions, setIsLoadingDeleteOptions] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [addBlockBoardId, setAddBlockBoardId] = useState<string>('');
  const [addBlockStartDate, setAddBlockStartDate] = useState<Date | undefined>();
  const [insertBeforeBlockId, setInsertBeforeBlockId] = useState<string | null>(null);

  // Event editing state
  const [editingEvent, setEditingEvent] = useState<TimelineEventType | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventBoardId, setEventBoardId] = useState<string>('');
  const [eventDefaultDate, setEventDefaultDate] = useState<Date | undefined>();

  // Availability editing state (single user)
  const [showAvailabilityPopup, setShowAvailabilityPopup] = useState(false);
  const [availabilityWeekStart, setAvailabilityWeekStart] = useState<Date | null>(null);
  const [availabilityMember, setAvailabilityMember] = useState<TimelineMember | null>(null);
  const [availabilityExisting, setAvailabilityExisting] = useState<UserWeeklyAvailability[]>([]);
  const [availabilityBoardId, setAvailabilityBoardId] = useState<string>('');
  const [timelineScrollTop, setTimelineScrollTop] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(84);
  const dateHeaderRef = useRef<HTMLDivElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const previousDisplayStartOffsetRef = useRef<number | null>(null);
  const shouldRealignTimelineRef = useRef(true);
  const knownProjectIdsRef = useRef<Set<string>>(
    new Set(initialProjects.map((project) => project.board.id))
  );
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);
  const [hasLoadedCollapsedState, setHasLoadedCollapsedState] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.sessionStorage.getItem(COLLAPSED_PROJECTS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const restored = new Set(
        parsed.filter((id): id is string => typeof id === 'string' && id.length > 0)
      );
      if (restored.size > 0 || parsed.length === 0) {
        setCollapsedProjectIds(restored);
      }
    } catch {
      // Ignore invalid session data
    } finally {
      setHasLoadedCollapsedState(true);
    }
  }, []);

  useEffect(() => {
    setCollapsedProjectIds((prev) => {
      const next = new Set(prev);
      let changed = false;

      for (const project of initialProjects) {
        const projectId = project.board.id;
        if (!knownProjectIdsRef.current.has(projectId)) {
          knownProjectIdsRef.current.add(projectId);
          next.add(projectId); // New projects start collapsed by default
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [initialProjects]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasLoadedCollapsedState) return;
    window.sessionStorage.setItem(
      COLLAPSED_PROJECTS_STORAGE_KEY,
      JSON.stringify(Array.from(collapsedProjectIds))
    );
  }, [collapsedProjectIds, hasLoadedCollapsedState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem(SHOW_BLOCK_INFO_STORAGE_KEY);
    if (stored === '0') setShowBlockInfo(false);
    if (stored === '1') setShowBlockInfo(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(SHOW_BLOCK_INFO_STORAGE_KEY, showBlockInfo ? '1' : '0');
  }, [showBlockInfo]);

  const queryClient = useQueryClient();
  const refreshTimeline = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['timeline'] });
  }, [queryClient]);

  // Open create dialog if requested via prop (e.g., from Boards page)
  useEffect(() => {
    if (openCreateDialog) {
      setShowCreateProject(true);
      // Clear the URL param without triggering a reload
      window.history.replaceState({}, '', '/timeline');
    }
  }, [openCreateDialog]);

  useEffect(() => {
    const element = dateHeaderRef.current;
    if (!element) return;

    const updateHeight = () => {
      setHeaderHeight(element.offsetHeight || 84);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = timelineScrollRef.current;
    if (!element) return;

    const updateWidth = () => {
      setTimelineViewportWidth(element.clientWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!userContextMenu && !projectContextMenu && !archivedProjectContextMenu) return;

    const closeMenus = () => {
      setUserContextMenu(null);
      setProjectContextMenu(null);
      setArchivedProjectContextMenu(null);
    };
    document.addEventListener('click', closeMenus);
    document.addEventListener('scroll', closeMenus, true);

    return () => {
      document.removeEventListener('click', closeMenus);
      document.removeEventListener('scroll', closeMenus, true);
    };
  }, [userContextMenu, projectContextMenu, archivedProjectContextMenu]);

  // Base date range - fixed 8 weeks
  const { startDate, totalDays: baseTotalDays } = useMemo(() => {
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

  const getBusinessDayOffset = useCallback((targetDate: Date) => {
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (target.getTime() === start.getTime()) return 0;

    if (target > start) {
      let count = 0;
      const cursor = new Date(start);
      while (cursor < target) {
        const day = cursor.getDay();
        if (day !== 0 && day !== 6) count++;
        cursor.setDate(cursor.getDate() + 1);
      }
      return count;
    }

    let count = 0;
    const cursor = new Date(start);
    while (cursor > target) {
      cursor.setDate(cursor.getDate() - 1);
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) count--;
    }

    return count;
  }, [startDate]);

  const { displayStartOffset, displayEndOffset } = useMemo(() => {
    let minOffset = 0;
    let maxOffset = Math.max(0, baseTotalDays - 1);

    for (const project of filteredProjects) {
      for (const block of project.blocks) {
        const startOffset = getBusinessDayOffset(new Date(block.startDate));
        const endOffset = getBusinessDayOffset(new Date(block.endDate)) + 1;
        if (startOffset < minOffset) minOffset = startOffset;
        if (endOffset > maxOffset) maxOffset = endOffset;
      }
      for (const event of project.events) {
        const startOffset = getBusinessDayOffset(new Date(event.startDate));
        const endOffset = getBusinessDayOffset(new Date(event.endDate)) + 1;
        if (startOffset < minOffset) minOffset = startOffset;
        if (endOffset > maxOffset) maxOffset = endOffset;
      }
      for (const availability of project.availability) {
        const weekStartOffset = getBusinessDayOffset(new Date(availability.weekStart));
        const weekEnd = addBusinessDays(new Date(availability.weekStart), 4);
        const endOffset = getBusinessDayOffset(weekEnd) + 1;
        if (weekStartOffset < minOffset) minOffset = weekStartOffset;
        if (endOffset > maxOffset) maxOffset = endOffset;
      }
    }

    const computedStartOffset = Math.min(0, minOffset - RANGE_LEFT_PADDING_DAYS);
    const computedEndOffset = Math.max(
      Math.max(0, baseTotalDays - 1),
      maxOffset + RANGE_RIGHT_PADDING_DAYS
    );

    return {
      displayStartOffset: computedStartOffset,
      displayEndOffset: computedEndOffset,
    };
  }, [filteredProjects, baseTotalDays, getBusinessDayOffset]);

  const viewportTotalDays = useMemo(() => {
    if (!timelineViewportWidth) return 0;
    return Math.ceil(timelineViewportWidth / COLUMN_WIDTH);
  }, [timelineViewportWidth]);

  const displayTotalDays = useMemo(() => {
    const minColumnsForViewport = displayStartOffset + Math.max(viewportTotalDays - 1, 0);
    const effectiveEndOffset = Math.max(displayEndOffset, minColumnsForViewport);
    return effectiveEndOffset - displayStartOffset + 1;
  }, [displayStartOffset, displayEndOffset, viewportTotalDays]);

  const displayStartDate = useMemo(
    () => addBusinessDays(new Date(startDate), displayStartOffset),
    [startDate, displayStartOffset]
  );

  const displayEndDate = useMemo(
    () => addBusinessDays(new Date(displayStartDate), Math.max(0, displayTotalDays - 1)),
    [displayStartDate, displayTotalDays]
  );

  const anchorScrollLeft = useMemo(
    () => Math.max(0, -displayStartOffset * COLUMN_WIDTH),
    [displayStartOffset]
  );

  useEffect(() => {
    shouldRealignTimelineRef.current = true;
  }, [currentDate]);

  useEffect(() => {
    const element = timelineScrollRef.current;
    if (!element) return;

    const previousOffset = previousDisplayStartOffsetRef.current;

    if (previousOffset === null) {
      element.scrollLeft = anchorScrollLeft;
      previousDisplayStartOffsetRef.current = displayStartOffset;
      shouldRealignTimelineRef.current = false;
      return;
    }

    const offsetDelta = displayStartOffset - previousOffset;

    if (shouldRealignTimelineRef.current) {
      element.scrollLeft = anchorScrollLeft;
      shouldRealignTimelineRef.current = false;
    } else if (offsetDelta !== 0) {
      // Keep the same visible date anchored when the computed range grows/shrinks.
      element.scrollLeft += -offsetDelta * COLUMN_WIDTH;
    }

    previousDisplayStartOffsetRef.current = displayStartOffset;
  }, [anchorScrollLeft, displayStartOffset]);

  const getProjectDisplayRows = useCallback((project: TimelineData) => {
    const assignments = project.board.projectRoleAssignments || [];
    if (assignments.length === 0) return [];

    const byUser = new Map<string, TimelineDisplayRow>();
    for (const assignment of assignments) {
      const member = project.board.members.find((m) => m.id === assignment.userId);
      if (!member) continue;

      const existing = byUser.get(member.id);
      if (existing) {
        if (!existing.roles.some((role) => role.id === assignment.roleId)) {
          existing.roles.push({
            id: assignment.roleId,
            name: assignment.roleName,
            color: assignment.roleColor,
          });
        }
        continue;
      }

      byUser.set(member.id, {
        id: assignment.id,
        userId: member.id,
        member,
        roles: [
          {
            id: assignment.roleId,
            name: assignment.roleName,
            color: assignment.roleColor,
          },
        ],
      });
    }
    return Array.from(byUser.values());
  }, []);

  const renderCompactRoleTags = useCallback((roles: TimelineDisplayRow['roles']) => {
    if (roles.length === 0) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-text-tertiary bg-surface-hover">
          No role
        </span>
      );
    }

    const visibleRoles = roles.slice(0, 2);
    const hiddenCount = roles.length - visibleRoles.length;
    const allRoleNames = roles.map((role) => role.name).join(', ');

    return (
      <>
        {visibleRoles.map((role) => (
          <span
            key={role.id}
            className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate"
            style={{
              backgroundColor: `${role.color || 'var(--text-tertiary)'}22`,
              color: role.color || 'var(--text-tertiary)',
            }}
            title={allRoleNames}
          >
            {role.name}
          </span>
        ))}
        {hiddenCount > 0 ? (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium text-text-tertiary bg-surface-hover"
            title={allRoleNames}
          >
            +{hiddenCount}
          </span>
        ) : null}
      </>
    );
  }, []);

  const projectViews = useMemo(
    () =>
      filteredProjects.map((project) => ({
        project,
        displayRows: getProjectDisplayRows(project),
        teamTint: getTeamTint(project.board.team?.color, '14'),
        teamTintSoft: getTeamTint(project.board.team?.color, '0D'),
        teamTintRow: getTeamTint(project.board.team?.color, '10'),
        leftTeamTint: getTeamTint(project.board.team?.color, '14'),
        leftTeamTintSoft: getTeamTint(project.board.team?.color, '0D'),
        leftTeamTintRow: getTeamTint(project.board.team?.color, '10'),
      })),
    [filteredProjects, getProjectDisplayRows, getTeamTint]
  );

  // Handlers

  const centerTimelineOnDate = useCallback((targetDate: Date) => {
    const normalizedTarget = new Date(targetDate);
    normalizedTarget.setHours(0, 0, 0, 0);

    const centeredStart = addBusinessDays(
      normalizedTarget,
      -Math.floor((WEEKS_TO_SHOW * 5) / 2)
    );
    const day = centeredStart.getDay();
    const diff = centeredStart.getDate() - day + (day === 0 ? -6 : 1);
    centeredStart.setDate(diff);

    setCurrentDate(centeredStart);
  }, []);

  const getProjectCenterDate = useCallback((project: TimelineData): Date | null => {
    const rangeDates: Date[] = [];

    for (const block of project.blocks) {
      rangeDates.push(new Date(block.startDate));
      rangeDates.push(new Date(block.endDate));
    }
    for (const event of project.events) {
      rangeDates.push(new Date(event.startDate));
      rangeDates.push(new Date(event.endDate));
    }
    for (const availability of project.availability) {
      const weekStart = new Date(availability.weekStart);
      rangeDates.push(weekStart);
      rangeDates.push(addBusinessDays(new Date(weekStart), 4));
    }

    if (rangeDates.length === 0) {
      return null;
    }

    let minTime = rangeDates[0].getTime();
    let maxTime = rangeDates[0].getTime();

    for (const date of rangeDates) {
      const timestamp = date.getTime();
      if (timestamp < minTime) minTime = timestamp;
      if (timestamp > maxTime) maxTime = timestamp;
    }

    return new Date(Math.round((minTime + maxTime) / 2));
  }, []);

  const handleTodayClick = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    centerTimelineOnDate(today);
  }, [centerTimelineOnDate]);

  const handleTimelineWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const canScrollHorizontally = element.scrollWidth > element.clientWidth;
    if (!canScrollHorizontally) return;

    const atTop = element.scrollTop <= 0;
    const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;

    // Horizontal scroll support:
    // - Shift + wheel always scrolls horizontally
    // - At vertical bounds, wheel continues horizontally
    const shouldScrollHorizontally =
      e.shiftKey || (e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom);

    if (!shouldScrollHorizontally || Math.abs(e.deltaY) < 0.5) return;

    element.scrollLeft += e.deltaY;
    e.preventDefault();
  }, []);

  const handleTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setTimelineScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleToggleProjectCollapse = useCallback((projectId: string) => {
    setCollapsedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const handleCollapseAllProjects = useCallback(() => {
    setCollapsedProjectIds((prev) => {
      const next = new Set(prev);
      for (const item of projectViews) {
        next.add(item.project.board.id);
      }
      return next;
    });
  }, [projectViews]);

  const handleExpandAllProjects = useCallback(() => {
    setCollapsedProjectIds((prev) => {
      const next = new Set(prev);
      for (const item of projectViews) {
        next.delete(item.project.board.id);
      }
      return next;
    });
  }, [projectViews]);

  const allVisibleProjectsCollapsed = useMemo(
    () =>
      projectViews.length > 0 &&
      projectViews.every((item) => collapsedProjectIds.has(item.project.board.id)),
    [projectViews, collapsedProjectIds]
  );

  const handleToggleAllMembers = useCallback(() => {
    if (allVisibleProjectsCollapsed) {
      handleExpandAllProjects();
    } else {
      handleCollapseAllProjects();
    }
  }, [allVisibleProjectsCollapsed, handleExpandAllProjects, handleCollapseAllProjects]);

  const handleUserContextMenu = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    userId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectContextMenu(null);
    setArchivedProjectContextMenu(null);
    setUserContextMenu({
      userId,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const handleProjectContextMenu = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    projectId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setUserContextMenu(null);
    setArchivedProjectContextMenu(null);
    setProjectContextMenu({
      projectId,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const handleArchivedProjectContextMenu = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    projectId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setUserContextMenu(null);
    setProjectContextMenu(null);
    setArchivedProjectContextMenu({
      projectId,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const handleCenterOnProject = useCallback((project: TimelineData) => {
    const centerDate = getProjectCenterDate(project);
    if (!centerDate) return;
    centerTimelineOnDate(centerDate);
  }, [centerTimelineOnDate, getProjectCenterDate]);

  const handleOpenUserPage = useCallback((userId: string) => {
    router.push(`/users/${userId}`);
    setUserContextMenu(null);
  }, [router]);

  const handleOpenProjectPage = useCallback((projectId: string) => {
    router.push(`/projects/${projectId}`);
    setProjectContextMenu(null);
    setArchivedProjectContextMenu(null);
  }, [router]);

  const handleLoadArchivedProject = useCallback(async (projectId: string) => {
    if (!projectId || loadingArchivedProjectId === projectId) return;

    setLoadingArchivedProjectId(projectId);
    try {
      const result = await apiFetch<{ project: TimelineData }>(
        `/api/timeline/projects/${projectId}`
      );
      const loadedProject = result.project;

      setProjects((prev) => {
        if (prev.some((project) => project.board.id === loadedProject.board.id)) {
          return prev;
        }
        return [...prev, loadedProject].sort((a, b) =>
          getProjectDisplayName(a.board.name, { productionTitle: a.board.productionTitle ?? undefined })
            .localeCompare(
              getProjectDisplayName(b.board.name, { productionTitle: b.board.productionTitle ?? undefined }),
              undefined,
              { sensitivity: 'base' }
            )
        );
      });

      setCollapsedProjectIds((prev) => {
        const next = new Set(prev);
        next.add(loadedProject.board.id);
        return next;
      });
      setArchivedProjects((prev) => prev.filter((project) => project.id !== projectId));

      handleCenterOnProject(loadedProject);
    } catch (error) {
      console.error('Failed to load archived project:', error);
    } finally {
      setLoadingArchivedProjectId(null);
      setArchivedProjectContextMenu(null);
    }
  }, [handleCenterOnProject, loadingArchivedProjectId]);

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
        await refreshTimeline();
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  }, [refreshTimeline]);

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

    await refreshTimeline();
  }, [eventBoardId, refreshTimeline]);

  const handleEventModalDelete = useCallback(async (eventId: string) => {
    const response = await fetch(`/api/boards/${eventBoardId}/timeline/events/${eventId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete event');
    }

    await refreshTimeline();
  }, [eventBoardId, refreshTimeline]);

  const handleCloseEventModal = useCallback(() => {
    setShowEventModal(false);
    setEditingEvent(null);
    setEventBoardId('');
    setEventDefaultDate(undefined);
  }, []);

  // Handle opening availability popup for a single user
  const handleOpenAvailabilityPopup = useCallback((
    boardId: string,
    weekStart: Date,
    member: TimelineMember
  ) => {
    const project = projects.find(p => p.board.id === boardId);
    if (!project) return;

    // Get existing availability for this week and this user
    const weekKey = formatLocalDateKey(getMonday(weekStart));
    const existingForWeek = project.availability.filter(a => {
      const availWeekKey = formatLocalDateKey(getMonday(new Date(a.weekStart)));
      return availWeekKey === weekKey && a.userId === member.id;
    });

    setAvailabilityBoardId(boardId);
    setAvailabilityWeekStart(weekStart);
    setAvailabilityMember(member);
    setAvailabilityExisting(existingForWeek);
    setShowAvailabilityPopup(true);
  }, [projects]);

  // Handle closing availability popup
  const handleCloseAvailabilityPopup = useCallback(() => {
    setShowAvailabilityPopup(false);
    setAvailabilityWeekStart(null);
    setAvailabilityMember(null);
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

    await refreshTimeline();
  }, [refreshTimeline]);

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
        await refreshTimeline();
      }
    } catch (error) {
      console.error('Failed to move event:', error);
      await refreshTimeline();
    }
  }, [projects, refreshTimeline]);

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
        await refreshTimeline();
      }
    } catch (error) {
      console.error('Failed to move blocks:', error);
      await refreshTimeline();
    }
  }, [projects, refreshTimeline]);

  // Block delete handler (from context menu)
  // Deletes a block and shifts all blocks to the right of it left by one week
  const handleBlockDelete = useCallback(async (block: TimelineBlock) => {
    const project = projects.find(p => p.blocks.some(b => b.id === block.id));
    if (!project) return;

    setPendingDeleteBlock(block);
    setDeleteOptions(null);
    setDeleteDestinationListId('');
    setDeleteCardsInstead(false);
    setIsLoadingDeleteOptions(true);

    try {
      const response = await fetch(
        `/api/boards/${project.board.id}/timeline/blocks/${block.id}/delete-options`
      );
      if (!response.ok) {
        throw new Error('Failed to load block delete options');
      }

      const json = await response.json();
      const options = json.data as BlockDeleteOptions;
      setDeleteOptions(options);
      if (options.recommendedListId) {
        setDeleteDestinationListId(options.recommendedListId);
      }
    } catch (error) {
      console.error('Failed to load block delete options:', error);
      setPendingDeleteBlock(null);
      setDeleteOptions(null);
    } finally {
      setIsLoadingDeleteOptions(false);
    }
  }, [projects]);

  const handleCancelBlockDelete = useCallback(() => {
    setPendingDeleteBlock(null);
    setDeleteOptions(null);
    setDeleteDestinationListId('');
    setDeleteCardsInstead(false);
    setIsLoadingDeleteOptions(false);
    setIsDeletingBlock(false);
  }, []);

  const handleConfirmBlockDelete = useCallback(async () => {
    if (!pendingDeleteBlock) return;
    const project = projects.find(p => p.blocks.some(b => b.id === pendingDeleteBlock.id));
    if (!project) return;

    const options = deleteOptions;
    const hasCards = (options?.cardCount ?? 0) > 0;
    const requiresDestination = hasCards && !options?.requiresCardDeletion;

    if (requiresDestination && !deleteDestinationListId) {
      return;
    }
    if (options?.requiresCardDeletion && hasCards && !deleteCardsInstead) {
      return;
    }

    setIsDeletingBlock(true);
    try {
      const response = await fetch(
        `/api/boards/${project.board.id}/timeline/blocks/${pendingDeleteBlock.id}/delete-and-shift`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            syncToList: true,
            destinationListId: requiresDestination ? deleteDestinationListId : null,
            deleteCards: options?.requiresCardDeletion ? deleteCardsInstead : false,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete block');
      }

      setProjects((prev) =>
        prev.map((projectData) => ({
          ...projectData,
          blocks: projectData.blocks.filter((b) => b.id !== pendingDeleteBlock.id),
        }))
      );
      if (selectedBlockId === pendingDeleteBlock.id) {
        setSelectedBlockId(undefined);
      }

      await refreshTimeline();
      handleCancelBlockDelete();
    } catch (error) {
      console.error('Failed to delete block:', error);
    } finally {
      setIsDeletingBlock(false);
    }
  }, [
    pendingDeleteBlock,
    projects,
    deleteOptions,
    deleteDestinationListId,
    deleteCardsInstead,
    selectedBlockId,
    refreshTimeline,
    handleCancelBlockDelete,
  ]);

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

    await refreshTimeline();
  }, [projects, refreshTimeline]);

  // Block delete from modal handler
  const handleBlockDeleteFromModal = useCallback(async (blockId: string) => {
    const project = projects.find(p => p.blocks.some(b => b.id === blockId));
    if (!project) return;
    const block = project.blocks.find((b) => b.id === blockId);
    if (!block) return;

    setEditingBlock(null);
    await handleBlockDelete(block);
  }, [projects, handleBlockDelete]);

  // Add block handler
  const handleAddBlock = useCallback((boardId: string, blockStartDate?: Date) => {
    setAddBlockBoardId(boardId);
    setAddBlockStartDate(blockStartDate);
    setInsertBeforeBlockId(null);
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

    await refreshTimeline();
  }, [addBlockBoardId, insertBeforeBlockId, refreshTimeline]);

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
        showFilterButton={false}
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
        <div
          className="w-[376px] flex-shrink-0 border-r border-border bg-surface overflow-hidden relative z-30"
          style={{ width: LEFT_COLUMN_WIDTH }}
        >
          <div
            className="border-b border-border bg-surface px-3 py-2 flex flex-col justify-end gap-2"
            style={{ height: headerHeight }}
          >
            <span className="text-caption font-medium text-text-secondary">Projects</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowFilters((prev) => !prev)}
              >
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleToggleAllMembers}
              >
                {allVisibleProjectsCollapsed ? 'Show Members' : 'Hide Members'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowBlockInfo((prev) => !prev)}
              >
                {showBlockInfo ? 'Hide Block Info' : 'Show Block Info'}
              </Button>
            </div>
          </div>
          <div style={{ transform: `translateY(-${timelineScrollTop}px)` }}>
            {projectViews.map((item) => {
              const isCollapsed = collapsedProjectIds.has(item.project.board.id);
              return (
                <div key={item.project.board.id} className="mb-2">
                <div
                  className="flex items-center gap-2 px-3 pl-4 border-b border-border-subtle"
                  style={{ height: EVENT_ROW_HEIGHT, backgroundColor: item.leftTeamTintSoft }}
                >
                  <Flag className="h-3 w-3 text-text-tertiary" />
                  <span className="text-tiny text-text-tertiary">Events</span>
                </div>

                <div
                  className="flex items-center gap-2 px-3 border-b border-border-subtle"
                  style={{
                    height: ROW_HEIGHT,
                    borderLeftWidth: item.project.board.team?.color ? 4 : 0,
                    borderLeftColor: item.project.board.team?.color || undefined,
                    backgroundColor: item.leftTeamTint,
                  }}
                  onContextMenu={(e) => handleProjectContextMenu(e, item.project.board.id)}
                  onDoubleClick={() => handleCenterOnProject(item.project)}
                >
                  {item.project.board.team?.color ? (
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: item.project.board.team.color }}
                    />
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <div className="text-body font-medium text-text-primary truncate">
                      {getProjectDisplayName(item.project.board.name, { productionTitle: item.project.board.productionTitle ?? undefined })}
                    </div>
                    {item.project.board.team?.name ? (
                      <div className="text-tiny text-text-tertiary truncate">
                        {item.project.board.team.name}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 text-text-tertiary">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-tiny">{item.displayRows.length}</span>
                  </div>
                  <button
                    type="button"
                    className="ml-1 rounded p-1 text-text-tertiary hover:bg-surface-hover"
                    onClick={() => handleToggleProjectCollapse(item.project.board.id)}
                    title={isCollapsed ? 'Show members' : 'Hide members'}
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {!isCollapsed && item.displayRows.map((row) => (
                  <div
                    key={`${item.project.board.id}-${row.userId}`}
                    className="flex items-center gap-1.5 px-3 pl-5 border-b border-border-subtle"
                    style={{ height: USER_ROW_HEIGHT, backgroundColor: item.leftTeamTintRow }}
                    onContextMenu={(e) => handleUserContextMenu(e, row.userId)}
                  >
                    <Avatar className="h-5 w-5 flex-shrink-0">
                      <AvatarImage src={row.member.image || undefined} />
                      <AvatarFallback className="text-[9px]">
                        {(row.member.name || row.member.email)[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-caption truncate flex-1 text-text-secondary">
                      {row.member.name || row.member.email}
                    </span>
                    <div className="flex items-center gap-1 max-w-[132px] overflow-hidden">
                      {renderCompactRoleTags(row.roles)}
                    </div>
                  </div>
                ))}

                <div
                  className="h-2 border-b border-border"
                  style={{ backgroundColor: item.leftTeamTintSoft }}
                />
                </div>
              );
            })}

            {archivedProjects.length > 0 && (
              <div
                className="flex items-center px-3 border-y border-border bg-surface/70"
                style={{ height: ARCHIVED_SECTION_HEADER_HEIGHT }}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  Archived projects
                </span>
              </div>
            )}

            {archivedProjects.map((project) => (
              <div
                key={`archived-title-${project.id}`}
                className="flex items-center px-3 border-b border-border-subtle bg-surface-hover/40"
                style={{ height: ROW_HEIGHT }}
                onContextMenu={(e) => handleArchivedProjectContextMenu(e, project.id)}
              >
                <span className="text-caption text-text-secondary truncate" title={getProjectDisplayName(project.name, { productionTitle: project.productionTitle ?? undefined })}>
                  {getProjectDisplayName(project.name, { productionTitle: project.productionTitle ?? undefined })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex-1 overflow-auto"
          ref={timelineScrollRef}
          onWheel={handleTimelineWheel}
          onScroll={handleTimelineScroll}
        >
          <div
            className="min-w-full bg-background"
            style={{ width: displayTotalDays * COLUMN_WIDTH }}
          >
            <div ref={dateHeaderRef} className="sticky top-0 z-20">
              <TimelineDateHeader
                startDate={displayStartDate}
                endDate={displayEndDate}
                columnWidth={COLUMN_WIDTH}
              />
            </div>

            {projectViews.map((item) => {
              const isCollapsed = collapsedProjectIds.has(item.project.board.id);
              return (
                <div key={item.project.board.id} className="mb-2">
                <div style={{ backgroundColor: item.teamTintSoft }}>
                  <TimelineEventsRow
                    events={item.project.events}
                    startDate={displayStartDate}
                    columnWidth={COLUMN_WIDTH}
                    rowHeight={EVENT_ROW_HEIGHT}
                    onEventClick={(event) => handleEventClick(event, item.project.board.id)}
                    onEventEdit={(event) => handleEventEdit(event, item.project.board.id)}
                    onEventDelete={(event) => handleEventDelete(event, item.project.board.id)}
                    onAddEvent={(date) => handleAddEvent(item.project.board.id, date)}
                    onEventMove={(eventId, daysDelta) =>
                      handleEventMove(eventId, daysDelta, item.project.board.id)
                    }
                    selectedEventId={selectedEventId}
                    totalColumns={displayTotalDays}
                    isAdmin={isAdmin}
                  />
                </div>

                <div style={{ backgroundColor: item.teamTint }}>
                  <TimelineBlocksRow
                    blocks={item.project.blocks}
                    startDate={displayStartDate}
                    columnWidth={COLUMN_WIDTH}
                    rowHeight={ROW_HEIGHT}
                    onBlockClick={handleBlockClick}
                    onBlockGroupMove={handleBlockGroupMove}
                    onBlockDelete={handleBlockDelete}
                    onBlockInsert={handleBlockInsert}
                    onAddBlock={(date) => handleAddBlock(item.project.board.id, date)}
                    selectedBlockId={selectedBlockId}
                    totalColumns={displayTotalDays}
                    isAdmin={isAdmin}
                    showBlockMetrics={showBlockInfo}
                  />
                </div>

                {!isCollapsed && item.displayRows.map((row) => (
                  <div
                    key={`${item.project.board.id}-availability-${row.userId}`}
                    style={{ backgroundColor: item.teamTintRow }}
                  >
                    <TimelineUserAvailabilityRow
                      member={row.member}
                      availability={item.project.availability}
                      boardId={item.project.board.id}
                      startDate={displayStartDate}
                      endDate={displayEndDate}
                      columnWidth={COLUMN_WIDTH}
                      rowHeight={USER_ROW_HEIGHT}
                      onWeekClick={(weekStart, clickedMember) =>
                        handleOpenAvailabilityPopup(item.project.board.id, weekStart, clickedMember)
                      }
                      isAdmin={isAdmin}
                    />
                  </div>
                ))}

                <div
                  className="h-2 border-b border-border"
                  style={{ backgroundColor: item.teamTintSoft }}
                />
                </div>
              );
            })}

            {archivedProjects.length > 0 && (
              <div
                className="border-y border-border bg-surface/70"
                style={{ height: ARCHIVED_SECTION_HEADER_HEIGHT }}
              />
            )}

            {archivedProjects.map((project) => (
              <div
                key={`archived-spacer-${project.id}`}
                className="border-b border-border-subtle"
                style={{ height: ROW_HEIGHT }}
              />
            ))}

            {projectViews.length === 0 && archivedProjects.length === 0 && (
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

        {userContextMenu && (
          <div
            className="fixed bg-surface border border-border rounded-md shadow-lg py-1 z-50 min-w-36"
            style={{ left: userContextMenu.x, top: userContextMenu.y }}
          >
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-body hover:bg-surface-hover"
              onClick={() => handleOpenUserPage(userContextMenu.userId)}
            >
              Open user page
            </button>
          </div>
        )}

        {projectContextMenu && (
          <div
            className="fixed bg-surface border border-border rounded-md shadow-lg py-1 z-50 min-w-36"
            style={{ left: projectContextMenu.x, top: projectContextMenu.y }}
          >
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-body hover:bg-surface-hover"
              onClick={() => handleOpenProjectPage(projectContextMenu.projectId)}
            >
              Open project page
            </button>
          </div>
        )}

        {archivedProjectContextMenu && (
          <div
            className="fixed bg-surface border border-border rounded-md shadow-lg py-1 z-50 min-w-48"
            style={{ left: archivedProjectContextMenu.x, top: archivedProjectContextMenu.y }}
          >
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-body hover:bg-surface-hover disabled:opacity-60"
              disabled={loadingArchivedProjectId === archivedProjectContextMenu.projectId}
              onClick={() => handleLoadArchivedProject(archivedProjectContextMenu.projectId)}
            >
              {loadingArchivedProjectId === archivedProjectContextMenu.projectId
                ? 'Loading project...'
                : 'Load and center project'}
            </button>
          </div>
        )}
      </div>

      <Dialog open={!!pendingDeleteBlock} onOpenChange={(open) => !open && handleCancelBlockDelete()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Timeline Block</DialogTitle>
            <DialogDescription>
              {pendingDeleteBlock
                ? `Delete "${pendingDeleteBlock.blockType.name} ${pendingDeleteBlock.position}" and shift later blocks left by one week.`
                : 'Delete this block.'}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDeleteOptions ? (
            <div className="text-caption text-text-secondary">Loading delete options...</div>
          ) : (
            <div className="space-y-3">
              {deleteOptions?.cardCount ? (
                <>
                  <div className="text-caption text-text-secondary">
                    {deleteOptions.cardCount} card(s) exist in linked list{' '}
                    <span className="font-medium text-text-primary">
                      {deleteOptions.linkedList?.name}
                    </span>
                    .
                  </div>

                  {deleteOptions.requiresCardDeletion ? (
                    <div className="space-y-2">
                      <p className="text-caption text-text-secondary">
                        This is the only available planning list. Cards must be deleted before the block can be deleted.
                      </p>
                      <label className="flex items-center gap-2 text-caption text-text-primary">
                        <input
                          type="checkbox"
                          checked={deleteCardsInstead}
                          onChange={(e) => setDeleteCardsInstead(e.target.checked)}
                        />
                        Delete these cards and then delete the block
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-caption text-text-secondary">
                        Choose a destination list for the cards.
                      </p>
                      <Select
                        value={deleteDestinationListId}
                        onValueChange={(value) => setDeleteDestinationListId(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination list" />
                        </SelectTrigger>
                        <SelectContent>
                          {deleteOptions.availableLists.map((list) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name}
                              {deleteOptions.recommendedListId === list.id ? ' (Recommended)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-caption text-text-secondary">
                  No cards exist in the linked list. The block can be deleted directly.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleCancelBlockDelete} disabled={isDeletingBlock}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmBlockDelete}
                  disabled={
                    isDeletingBlock ||
                    isLoadingDeleteOptions ||
                    (!!deleteOptions?.cardCount &&
                      ((deleteOptions.requiresCardDeletion && !deleteCardsInstead) ||
                        (!deleteOptions.requiresCardDeletion && !deleteDestinationListId)))
                  }
                >
                  {isDeletingBlock ? 'Deleting...' : 'Delete Block'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Week Availability Popup (single user) */}
      {showAvailabilityPopup && availabilityWeekStart && availabilityMember && (
        <WeekAvailabilityPopup
          isOpen={showAvailabilityPopup}
          onClose={handleCloseAvailabilityPopup}
          weekStart={availabilityWeekStart}
          member={availabilityMember}
          existingAvailability={availabilityExisting}
          boardId={availabilityBoardId}
          onSave={handleSaveAvailability}
        />
      )}
    </div>
  );
}
