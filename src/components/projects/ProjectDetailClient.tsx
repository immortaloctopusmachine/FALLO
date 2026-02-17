'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink,
  Users,
  Calendar,
  UserPlus,
  X,
  Check,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
  Target,
  TrendingUp,
  CheckCircle2,
  BookOpen,
  AlertTriangle,
  ShieldAlert,
  Plus,
  Trash2,
  Link as LinkIcon,
  Calculator,
  Pencil,
  UserMinus,
  User,
  Settings,
  Archive,
  Gauge,
  Hash,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getBoardBackgroundStyle } from '@/lib/board-backgrounds';
import { getProjectDisplayName } from '@/lib/project-utils';
import type { BoardSettings } from '@/types';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompanyRoleInfo {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

interface MemberUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  userCompanyRoles: {
    companyRole: CompanyRoleInfo;
  }[];
}

interface ProjectMember {
  id: string;
  permission: string;
  user: MemberUser;
}

interface TeamInfo {
  id: string;
  name: string;
  color: string;
}

interface AvailableUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface ProjectRoleAssignment {
  id: string;
  roleId: string;
  roleName: string;
  roleColor?: string | null;
  userId: string;
}

interface ListForStats {
  id: string;
  name: string;
  viewType: string;
  phase: string | null;
  cards: {
    id: string;
    type: string;
    listId: string;
    taskData?: { storyPoints?: number | null } | null;
    userStoryData?: { flags?: string[] } | null;
  }[];
}

interface WeeklyProgressForStats {
  id: string;
  completedPoints: number;
}

interface TimelineEventData {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  eventType: EventTypeInfo;
}

interface TimelineBlockData {
  id: string;
  startDate: string;
  endDate: string;
  position: number;
  blockType: {
    id: string;
    name: string;
    color: string;
    description: string | null;
    isDefault: boolean;
    position: number;
  };
}

interface EventTypeInfo {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
  isDefault: boolean;
  position: number;
}

interface ProjectDetailClientProps {
  board: {
    id: string;
    name: string;
    description: string | null;
    teamId: string | null;
    team: TeamInfo | null;
    settings: BoardSettings;
    members: ProjectMember[];
    lists: ListForStats[];
    weeklyProgress: WeeklyProgressForStats[];
    timelineEvents: TimelineEventData[];
    timelineBlocks: TimelineBlockData[];
  };
  teams: TeamInfo[];
  companyRoles: CompanyRoleInfo[];
  eventTypes: EventTypeInfo[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canViewQualitySummaries: boolean;
}

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_ROLE_NAMES = ['MATH', 'PO', 'LEAD', 'DEV', 'ARTIST', 'ANIMATOR', 'QA'];
const DEFAULT_EVENT_ORDER = ['Release', 'Client', 'Server', 'GSD'];
const LS_KEY_DISMISS_ROLES_INFO = 'fallo:dismiss-roles-info';
const LS_KEY_DISMISS_DATES_INFO = 'fallo:dismiss-dates-info';

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  valueColor,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-background p-2.5">
      <div className="flex items-center gap-1.5 text-caption text-text-tertiary mb-0.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={cn('text-title font-bold', valueColor)}>{value}</div>
      {sub && <div className="text-tiny text-text-tertiary">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Picker Popover (for roles table)
// ---------------------------------------------------------------------------

function UserPicker({
  members,
  selectedUserId,
  onSelect,
}: {
  members: ProjectMember[];
  selectedUserId: string;
  onSelect: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = members.find(m => m.user.id === selectedUserId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 w-full rounded-md border border-border bg-surface px-2 py-1 text-body hover:bg-surface-hover transition-colors text-left"
        >
          {selected ? (
            <>
              <Avatar className="h-5 w-5">
                <AvatarImage src={selected.user.image || undefined} />
                <AvatarFallback className="text-[10px]">
                  {(selected.user.name || selected.user.email)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selected.user.name || selected.user.email}</span>
            </>
          ) : (
            <span className="text-text-tertiary">Select member...</span>
          )}
          <ChevronsUpDown className="ml-auto h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandList>
            <CommandEmpty>No members found.</CommandEmpty>
            <CommandGroup>
              {members.map(m => (
                <CommandItem
                  key={m.user.id}
                  value={m.user.name || m.user.email}
                  onSelect={() => {
                    onSelect(m.user.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-3.5 w-3.5', selectedUserId === m.user.id ? 'opacity-100' : 'opacity-0')} />
                  <Avatar className="h-5 w-5 mr-2">
                    <AvatarImage src={m.user.image || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(m.user.name || m.user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{m.user.name || 'Unnamed'}</span>
                    <span className="text-tiny text-text-tertiary truncate">{m.user.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Helper: calculate Last Tweak and Last Static Art from TWEAK blocks
// ---------------------------------------------------------------------------

function getCalculatedDates(blocks: TimelineBlockData[]) {
  // Find the last block where blockType.name matches "Tweak" (case-insensitive)
  const tweakBlocks = blocks.filter(b =>
    b.blockType.name.toLowerCase().includes('tweak')
  );
  if (tweakBlocks.length === 0) return { lastTweak: null, lastStaticArt: null };

  const lastTweakBlock = tweakBlocks[tweakBlocks.length - 1];
  // Last Tweak = block endDate (already a Friday since blocks end on Friday)
  const lastTweak = parseApiDate(lastTweakBlock.endDate);

  // Last Static Assets = endDate minus 2 days (Wednesday)
  const [year, month, day] = lastTweak.split('-').map(Number);
  const endDate = new Date(year, month - 1, day - 2);
  const lastStaticArt = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  return { lastTweak, lastStaticArt };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProjectDetailClient({
  board,
  teams,
  companyRoles,
  eventTypes,
  isAdmin,
  isSuperAdmin,
  canViewQualitySummaries,
}: ProjectDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // ---- Team state ----
  const [teamId, setTeamId] = useState<string | null>(board.teamId);
  const [teamOpen, setTeamOpen] = useState(false);

  // ---- Member state ----
  const [members, setMembers] = useState<ProjectMember[]>(board.members);
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [usersOpen, setUsersOpen] = useState(false);
  const [memberContextMenu, setMemberContextMenu] = useState<{
    memberId: string;
    userId: string;
    userName: string;
    x: number;
    y: number;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // ---- Description state ----
  const [description, setDescription] = useState(board.description || '');
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  // ---- Links state ----
  const [oneDriveUrl, setOneDriveUrl] = useState(board.settings.projectLinks?.oneDrive || '');
  const [gameSpecUrl, setGameSpecUrl] = useState(board.settings.projectLinks?.gameSpecification || '');
  const [gameSheetUrl, setGameSheetUrl] = useState(board.settings.projectLinks?.gameSheetInfo || '');
  const [isSavingLinks, setIsSavingLinks] = useState(false);

  // ---- Slack channel state ----
  const [slackChannelId, setSlackChannelId] = useState(board.settings.slackChannelId || '');
  const [slackChannelName, setSlackChannelName] = useState(board.settings.slackChannelName || '');
  const [slackChannels, setSlackChannels] = useState<{ id: string; name: string; isPrivate: boolean }[]>([]);
  const [slackChannelOpen, setSlackChannelOpen] = useState(false);
  const [isSavingSlackChannel, setIsSavingSlackChannel] = useState(false);

  // ---- Project roles state ----
  const [projectRoleAssignments, setProjectRoleAssignments] = useState<ProjectRoleAssignment[]>(
    board.settings.projectRoleAssignments || []
  );
  const [isSavingProjectRoles, setIsSavingProjectRoles] = useState(false);

  // ---- Date override state ----
  const [lastTweakOverride, setLastTweakOverride] = useState(board.settings.lastTweakOverride || '');
  const [lastStaticArtOverride, setLastStaticArtOverride] = useState(board.settings.lastStaticArtOverride || '');
  const [editingTweakOverride, setEditingTweakOverride] = useState(false);
  const [editingStaticArtOverride, setEditingStaticArtOverride] = useState(false);

  // ---- Event date add popover ----
  const [addDateOpen, setAddDateOpen] = useState(false);

  // ---- Optimistic events (shown instantly before API response) ----
  const [optimisticEvents, setOptimisticEvents] = useState<TimelineEventData[]>([]);

  // ---- Production title inline-edit state ----
  const [isEditingProductionTitle, setIsEditingProductionTitle] = useState(false);
  const [productionTitleDraft, setProductionTitleDraft] = useState(board.settings.productionTitle || '');
  const [isSavingProductionTitle, setIsSavingProductionTitle] = useState(false);

  // ---- Dismissible info boxes (localStorage-backed) ----
  const [rolesInfoDismissed, setRolesInfoDismissed] = useState(true);
  const [datesInfoDismissed, setDatesInfoDismissed] = useState(true);

  // ---- Archive / Delete state ----
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [qualitySummary, setQualitySummary] = useState<ProjectQualitySummary | null>(null);
  const [qualityAdjustedVelocity, setQualityAdjustedVelocity] =
    useState<QualityAdjustedVelocityMetrics | null>(null);
  const [iterationDistribution, setIterationDistribution] =
    useState<IterationDistributionMetrics | null>(null);
  const [isLoadingQualitySummary, setIsLoadingQualitySummary] = useState(false);
  const [qualitySummaryExpanded, setQualitySummaryExpanded] = useState(false);

  // ---- Derived values ----
  const selectedTeam = teams.find(t => t.id === teamId);
  const memberUserIds = members.map(m => m.user.id);
  const availableUsers = users.filter(u => !memberUserIds.includes(u.id));
  const membersById = useMemo(() => {
    const map: Record<string, ProjectMember['user']> = {};
    for (const m of members) map[m.user.id] = m.user;
    return map;
  }, [members]);

  // Build userId → role name(s) lookup from project role assignments
  const userRoleMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of board.settings.projectRoleAssignments || []) {
      if (a.userId && a.roleName) {
        map[a.userId] = map[a.userId] ? `${map[a.userId]}, ${a.roleName}` : a.roleName;
      }
    }
    return map;
  }, [board.settings.projectRoleAssignments]);

  // ---- Stats ----
  const stats = useMemo(() => {
    const allTasks = board.lists.flatMap(list =>
      list.cards.filter(c => c.type === 'TASK')
    );
    const allUserStories = board.lists.flatMap(list =>
      list.cards.filter(c => c.type === 'USER_STORY')
    );
    const doneListId = board.lists.find(
      list => list.viewType === 'TASKS' && list.phase === 'DONE'
    )?.id;
    const totalPoints = allTasks.reduce(
      (sum, task) => sum + (task.taskData?.storyPoints ?? 0), 0
    );
    const doneTasks = doneListId ? allTasks.filter(t => t.listId === doneListId) : [];
    const completedPoints = doneTasks.reduce(
      (sum, task) => sum + (task.taskData?.storyPoints ?? 0), 0
    );
    const completionPct = totalPoints > 0
      ? Math.round((completedPoints / totalPoints) * 100)
      : 0;
    const velocity = board.weeklyProgress.length > 0
      ? Math.round(
          board.weeklyProgress.reduce((s, w) => s + w.completedPoints, 0) /
            board.weeklyProgress.length
        )
      : 0;
    const blockedStories = allUserStories.filter(s =>
      s.userStoryData?.flags?.includes('BLOCKED')
    ).length;
    const atRiskStories = allUserStories.filter(s =>
      s.userStoryData?.flags?.includes('HIGH_RISK')
    ).length;

    return {
      totalPoints,
      completedPoints,
      completionPct,
      velocity,
      totalTasks: allTasks.length,
      completedTasks: doneTasks.length,
      totalStories: allUserStories.length,
      blockedStories,
      atRiskStories,
    };
  }, [board.lists, board.weeklyProgress]);

  const qualityTierClass = (tier: ProjectQualitySummary['totals']['overallQualityTier']) => {
    if (tier === 'HIGH') return 'text-green-600';
    if (tier === 'MEDIUM') return 'text-amber-600';
    if (tier === 'LOW') return 'text-red-600';
    return 'text-text-tertiary';
  };

  const confidenceDotClass = (confidence: 'GREEN' | 'AMBER' | 'RED') => {
    if (confidence === 'GREEN') return 'bg-green-500';
    if (confidence === 'AMBER') return 'bg-amber-500';
    return 'bg-red-500';
  };

  const formatWeekStartLabel = (weekStart: string) => {
    const weekDate = new Date(`${weekStart}T00:00:00`);
    return weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderQualitySummary = () => {
    if (!canViewQualitySummaries) {
      return null;
    }

    return (
      <div
        className={cn(
          'border-b border-border bg-surface transition-all duration-300 overflow-hidden',
          qualitySummaryExpanded ? 'max-h-[1200px]' : 'max-h-10'
        )}
      >
        <div className="px-6 py-2">
          <button
            onClick={() => setQualitySummaryExpanded(!qualitySummaryExpanded)}
            className="flex items-center gap-2 text-caption font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {qualitySummaryExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Gauge className="h-4 w-4" />
            Quality Summary
          </button>
        </div>

        {qualitySummaryExpanded && (
          <div className="px-6 pb-5">
            <div className="max-w-6xl rounded-lg border border-border bg-surface p-4 space-y-4">
              {isLoadingQualitySummary ? (
                <div className="text-body text-text-tertiary">Loading quality summary...</div>
              ) : qualitySummary ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-border-subtle bg-background p-3">
                      <div className="text-caption text-text-tertiary">Overall</div>
                      <div className={cn('text-title font-semibold mt-1', qualityTierClass(qualitySummary.totals.overallQualityTier))}>
                        {qualitySummary.totals.overallAverage !== null
                          ? qualitySummary.totals.overallAverage.toFixed(2)
                          : 'Unscored'}
                      </div>
                      <div className="text-caption text-text-tertiary">
                        {qualitySummary.totals.overallQualityTier}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border-subtle bg-background p-3">
                      <div className="text-caption text-text-tertiary">Coverage</div>
                      <div className="text-title font-semibold mt-1 text-text-primary">
                        {qualitySummary.totals.finalizedTaskCount}/{qualitySummary.totals.doneTaskCount}
                      </div>
                      <div className="text-caption text-text-tertiary">finalized vs done tasks</div>
                    </div>

                    <div className="rounded-lg border border-border-subtle bg-background p-3">
                      <div className="text-caption text-text-tertiary">Avg Cycles</div>
                      <div className="text-title font-semibold mt-1 text-text-primary">
                        {qualitySummary.iterationMetrics.averageCyclesToDone !== null
                          ? qualitySummary.iterationMetrics.averageCyclesToDone.toFixed(2)
                          : 'N/A'}
                      </div>
                      <div className="text-caption text-text-tertiary">to reach Done</div>
                    </div>

                    <div className="rounded-lg border border-border-subtle bg-background p-3">
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
                    <div className="rounded-lg border border-border-subtle bg-background p-3">
                      <div className="mb-2 text-caption font-medium text-text-secondary">Tier Distribution</div>
                      <div className="grid grid-cols-2 gap-2 text-body">
                        <div className="rounded border border-border-subtle px-2 py-1 text-green-600">
                          High: {qualitySummary.tierDistribution.HIGH}
                        </div>
                        <div className="rounded border border-border-subtle px-2 py-1 text-amber-600">
                          Medium: {qualitySummary.tierDistribution.MEDIUM}
                        </div>
                        <div className="rounded border border-border-subtle px-2 py-1 text-red-600">
                          Low: {qualitySummary.tierDistribution.LOW}
                        </div>
                        <div className="rounded border border-border-subtle px-2 py-1 text-text-tertiary">
                          Unscored: {qualitySummary.tierDistribution.UNSCORED}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border-subtle bg-background p-3">
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
                    <div className="rounded-lg border border-border-subtle bg-background p-3">
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

                    <div className="rounded-lg border border-border-subtle bg-background p-3">
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
              ) : (
                <div className="text-body text-text-tertiary">
                  Quality summary is not available yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---- Background style ----
  const bgStyle = getBoardBackgroundStyle(board.settings);

  // ---- Display roles (with defaults when empty) ----
  const displayRoles = useMemo(() => {
    if (projectRoleAssignments.length > 0) return projectRoleAssignments;
    return DEFAULT_ROLE_NAMES.map((name, i) => ({
      id: `default-${i}`,
      roleId: '',
      roleName: name,
      roleColor: null as string | null | undefined,
      userId: '',
    }));
  }, [projectRoleAssignments]);

  // ---- Calculated dates from TWEAK blocks ----
  const calculatedDates = useMemo(
    () => getCalculatedDates(board.timelineBlocks),
    [board.timelineBlocks]
  );

  // ---- Event-based dates ----
  const eventsByTypeName = useMemo(() => {
    const map: Record<string, TimelineEventData> = {};
    for (const evt of board.timelineEvents) {
      map[evt.eventType.name] = evt;
    }
    // Merge optimistic events (shown before API confirms)
    for (const evt of optimisticEvents) {
      if (!map[evt.eventType.name]) {
        map[evt.eventType.name] = evt;
      }
    }
    return map;
  }, [board.timelineEvents, optimisticEvents]);

  // Build ordered date rows: default events first, then extras
  const dateRows = useMemo(() => {
    const rows: { eventTypeName: string; event: TimelineEventData | null; eventType: EventTypeInfo | null }[] = [];
    const usedNames = new Set<string>();

    // Default order first
    for (const name of DEFAULT_EVENT_ORDER) {
      const event = eventsByTypeName[name] || null;
      const et = eventTypes.find(t => t.name === name) || null;
      rows.push({ eventTypeName: name, event, eventType: et });
      usedNames.add(name);
    }

    // Then any other events on this board
    for (const evt of board.timelineEvents) {
      if (!usedNames.has(evt.eventType.name)) {
        rows.push({
          eventTypeName: evt.eventType.name,
          event: evt,
          eventType: eventTypes.find(t => t.id === evt.eventType.id) || evt.eventType,
        });
        usedNames.add(evt.eventType.name);
      }
    }

    return rows;
  }, [eventsByTypeName, board.timelineEvents, eventTypes]);

  // Event types not yet used on this board
  const unusedEventTypes = useMemo(() => {
    const usedTypeIds = new Set(board.timelineEvents.map(e => e.eventType.id));
    const usedNames = new Set(DEFAULT_EVENT_ORDER);
    // Also include default names that might not have events yet
    return eventTypes.filter(et => !usedTypeIds.has(et.id) && !usedNames.has(et.name));
  }, [eventTypes, board.timelineEvents]);

  // ---- Change detection ----
  const descriptionChanged = description !== (board.description || '');
  const linksChanged =
    oneDriveUrl !== (board.settings.projectLinks?.oneDrive || '') ||
    gameSpecUrl !== (board.settings.projectLinks?.gameSpecification || '') ||
    gameSheetUrl !== (board.settings.projectLinks?.gameSheetInfo || '');
  const projectRolesChanged =
    JSON.stringify(projectRoleAssignments) !==
    JSON.stringify(board.settings.projectRoleAssignments || []);

  // ---- Side effects ----
  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  // Read info box dismiss state from localStorage
  useEffect(() => {
    setRolesInfoDismissed(localStorage.getItem(LS_KEY_DISMISS_ROLES_INFO) === 'true');
    setDatesInfoDismissed(localStorage.getItem(LS_KEY_DISMISS_DATES_INFO) === 'true');
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/integrations/slack/channels');
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setSlackChannels(
            [...json.data].sort((a, b) =>
              String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' })
            )
          );
        }
      } catch {
        // Slack not configured — leave empty
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  useEffect(() => {
    setProjectRoleAssignments(board.settings.projectRoleAssignments || []);
  }, [board.settings.projectRoleAssignments]);

  useEffect(() => {
    setOptimisticEvents([]);
  }, [board.timelineEvents]);

  useEffect(() => {
    if (!canViewQualitySummaries) {
      setQualitySummary(null);
      setQualityAdjustedVelocity(null);
      setIterationDistribution(null);
      setIsLoadingQualitySummary(false);
      return;
    }

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
  }, [board.id, canViewQualitySummaries]);

  // Close context menu on click outside
  useEffect(() => {
    if (!memberContextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setMemberContextMenu(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMemberContextMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [memberContextMenu]);

  // ---- Invalidate helper ----
  const invalidateBoard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['boards', board.id, 'project'] });
  }, [queryClient, board.id]);

  // ---- Handlers ----

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) setUsers(data.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleTeamChange = async (newTeamId: string | null) => {
    setTeamId(newTeamId);
    setTeamOpen(false);
    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: newTeamId }),
      });
      const data = await response.json();
      if (!data.success) setTeamId(board.teamId);
      else router.refresh();
    } catch {
      setTeamId(board.teamId);
    }
  };

  const handleAddMember = async (userEmail: string) => {
    setUsersOpen(false);
    const addedUser = users.find(u => u.email === userEmail);
    const tempId = `temp-${Date.now()}`;

    // Optimistically show avatar immediately
    if (addedUser) {
      setMembers(prev => [
        ...prev,
        {
          id: tempId,
          permission: 'MEMBER',
          user: { ...addedUser, userCompanyRoles: [] },
        },
      ]);
    }

    try {
      const response = await fetch(`/api/boards/${board.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, permission: 'MEMBER' }),
      });
      const data = await response.json();
      if (data.success) {
        // Replace temp ID with real ID
        if (addedUser) {
          setMembers(prev => prev.map(m =>
            m.id === tempId ? { ...m, id: data.data.id } : m
          ));
        }
        invalidateBoard();
      } else {
        // Rollback
        setMembers(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (err) {
      console.error('Failed to add member:', err);
      setMembers(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(
        `/api/boards/${board.id}/members?memberId=${memberId}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (data.success) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleSaveDescription = async () => {
    setIsSavingDescription(true);
    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description || null }),
      });
      const data = await response.json();
      if (data.success) router.refresh();
    } catch (err) {
      console.error('Failed to save description:', err);
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleSaveLinks = async () => {
    setIsSavingLinks(true);
    try {
      const updatedSettings: BoardSettings = {
        ...board.settings,
        projectLinks: {
          ...board.settings.projectLinks,
          oneDrive: oneDriveUrl || undefined,
          gameSpecification: gameSpecUrl || undefined,
          gameSheetInfo: gameSheetUrl || undefined,
        },
      };
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      const data = await response.json();
      if (data.success) router.refresh();
    } catch (err) {
      console.error('Failed to save links:', err);
    } finally {
      setIsSavingLinks(false);
    }
  };

  const handleSaveSlackChannel = async (channelId: string, channelName: string) => {
    setIsSavingSlackChannel(true);
    try {
      const updatedSettings: BoardSettings = {
        ...board.settings,
        slackChannelId: channelId || undefined,
        slackChannelName: channelName || undefined,
      };
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['boards', board.id, 'project'] });
      }
    } catch (err) {
      console.error('Failed to save Slack channel:', err);
    } finally {
      setIsSavingSlackChannel(false);
    }
  };

  const handleSaveProductionTitle = async () => {
    setIsSavingProductionTitle(true);
    try {
      const updatedSettings: BoardSettings = {
        ...board.settings,
        productionTitle: productionTitleDraft.trim() || undefined,
      };
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      const data = await response.json();
      if (data.success) {
        setIsEditingProductionTitle(false);
        queryClient.invalidateQueries({ queryKey: ['boards', board.id, 'project'] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to save production title:', err);
    } finally {
      setIsSavingProductionTitle(false);
    }
  };

  // ---- Project role handlers ----

  const handleRoleRowChange = (
    rowId: string,
    field: 'roleId' | 'userId',
    value: string
  ) => {
    setProjectRoleAssignments(prev => {
      const row = prev.find(r => r.id === rowId);
      if (!row) return prev;

      const isDuplicate = (roleId: string, userId: string) =>
        prev.some(r => r.roleId === roleId && r.userId === userId && r.id !== rowId);

      if (field === 'roleId') {
        const role = companyRoles.find(r => r.id === value);
        if (!role) return prev;
        if (row.userId && isDuplicate(value, row.userId)) return prev;
        return prev.map(r =>
          r.id === rowId
            ? { ...r, roleId: role.id, roleName: role.name, roleColor: role.color }
            : r
        );
      } else {
        if (row.roleId && isDuplicate(row.roleId, value)) return prev;
        return prev.map(r => (r.id === rowId ? { ...r, userId: value } : r));
      }
    });
  };

  const handleAddRoleRow = () => {
    const rowId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setProjectRoleAssignments(prev => [
      ...prev,
      { id: rowId, roleId: '', roleName: '', roleColor: null, userId: '' },
    ]);
  };

  const handleDeleteRoleRow = (rowId: string) => {
    setProjectRoleAssignments(prev => prev.filter(r => r.id !== rowId));
  };

  const handleSaveProjectRoles = async () => {
    setIsSavingProjectRoles(true);
    try {
      const validAssignments = projectRoleAssignments.filter(
        r => r.roleId && r.userId
      );
      const updatedSettings: BoardSettings = {
        ...board.settings,
        projectRoleAssignments: validAssignments,
      };
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      const data = await response.json();
      if (data.success) router.refresh();
    } catch (err) {
      console.error('Failed to save project roles:', err);
    } finally {
      setIsSavingProjectRoles(false);
    }
  };

  // ---- Event date handlers ----

  const handleSetEventDate = async (eventTypeId: string, eventTypeName: string, date: string) => {
    const et = eventTypes.find(t => t.id === eventTypeId);
    if (!et) return;

    // Show optimistically
    const tempEvent: TimelineEventData = {
      id: `temp-${Date.now()}`,
      title: eventTypeName,
      description: null,
      startDate: date,
      endDate: date,
      eventType: et,
    };
    setOptimisticEvents(prev => [...prev, tempEvent]);

    try {
      const response = await fetch(`/api/boards/${board.id}/timeline/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTypeName,
          eventTypeId,
          startDate: date,
          endDate: date,
        }),
      });
      const data = await response.json();
      if (data.success) {
        invalidateBoard();
      } else {
        setOptimisticEvents(prev => prev.filter(e => e.id !== tempEvent.id));
      }
    } catch (err) {
      console.error('Failed to create event date:', err);
      setOptimisticEvents(prev => prev.filter(e => e.id !== tempEvent.id));
    }
  };

  const handleUpdateEventDate = async (eventId: string, date: string) => {
    try {
      const response = await fetch(`/api/boards/${board.id}/timeline/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: date, endDate: date }),
      });
      const data = await response.json();
      if (data.success) invalidateBoard();
    } catch (err) {
      console.error('Failed to update event date:', err);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/boards/${board.id}/timeline/events/${eventId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) invalidateBoard();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const handleSaveOverride = async (field: 'lastTweakOverride' | 'lastStaticArtOverride', value: string) => {
    try {
      const updatedSettings: BoardSettings = {
        ...board.settings,
        [field]: value || undefined,
      };
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      const data = await response.json();
      if (data.success) {
        invalidateBoard();
        if (field === 'lastTweakOverride') setEditingTweakOverride(false);
        else setEditingStaticArtOverride(false);
      }
    } catch (err) {
      console.error('Failed to save override:', err);
    }
  };

  const handleAddEventType = async (et: EventTypeInfo) => {
    setAddDateOpen(false);
    // Create event with today's date; user can then change it
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    await handleSetEventDate(et.id, et.name, today);
  };

  // ---- Archive / Delete handlers ----
  const handleArchiveProject = async () => {
    if (!confirm(`Archive project "${board.name}"? It will be hidden from the projects list but can be restored later.`)) {
      return;
    }
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/boards/${board.id}?scope=project`, { method: 'DELETE' });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['projects', 'archived'] });
        router.push('/projects');
      } else {
        console.error('Failed to archive project');
      }
    } catch (error) {
      console.error('Failed to archive project:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`Permanently delete project "${board.name}"? This cannot be undone. All lists, cards, and data will be lost.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      // First archive if not already archived
      const archiveRes = await fetch(`/api/boards/${board.id}?scope=project`, { method: 'DELETE' });
      if (!archiveRes.ok) {
        console.error('Failed to archive before delete');
        setIsDeleting(false);
        return;
      }
      // Then permanently delete
      const deleteRes = await fetch(`/api/boards/${board.id}?permanent=true`, { method: 'DELETE' });
      if (deleteRes.ok) {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['projects', 'archived'] });
        router.push('/projects');
      } else {
        console.error('Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <main className="flex-1">
      {/* ================================================================= */}
      {/* SECTION 1 — Banner Header                                         */}
      {/* ================================================================= */}
      <div className="relative h-[140px] w-full overflow-hidden">
        {bgStyle ? (
          <div className="absolute inset-0" style={bgStyle} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-surface-subtle to-surface-hover" />
        )}
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex items-end justify-between h-full p-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-md">
            {getProjectDisplayName(board.name, board.settings)}
          </h1>
          <div className="flex items-center gap-2">
            <Link href={`/boards/${board.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                Open Board
              </Button>
            </Link>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white px-2"
                    disabled={isArchiving || isDeleting}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={handleArchiveProject}
                    disabled={isArchiving}
                    className="text-warning focus:text-warning"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    {isArchiving ? 'Archiving...' : 'Archive Project'}
                  </DropdownMenuItem>
                  {isSuperAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleDeleteProject}
                        disabled={isDeleting}
                        className="text-error focus:text-error"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 1b — Title Sub-header                                     */}
      {/* ================================================================= */}
      <div className="border-b border-border bg-surface px-6 py-2">
        <div className="flex items-center gap-6 max-w-6xl text-body">
          <div className="flex items-center gap-2">
            <span className="text-text-tertiary text-caption">Working Title:</span>
            <span className="text-text-primary font-medium">{board.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-tertiary text-caption">Production Title:</span>
            {isEditingProductionTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={productionTitleDraft}
                  onChange={(e) => setProductionTitleDraft(e.target.value)}
                  className="h-7 w-48 rounded-md border border-input bg-background px-2 text-body shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Enter production title..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveProductionTitle();
                    if (e.key === 'Escape') {
                      setIsEditingProductionTitle(false);
                      setProductionTitleDraft(board.settings.productionTitle || '');
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleSaveProductionTitle}
                  disabled={isSavingProductionTitle}
                >
                  {isSavingProductionTitle ? '...' : <Check className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => {
                    setIsEditingProductionTitle(false);
                    setProductionTitleDraft(board.settings.productionTitle || '');
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : board.settings.productionTitle ? (
              <span
                className={cn(
                  'text-text-primary font-medium',
                  isAdmin && 'cursor-pointer hover:underline'
                )}
                onClick={() => isAdmin && setIsEditingProductionTitle(true)}
              >
                {board.settings.productionTitle}
              </span>
            ) : isAdmin ? (
              <button
                onClick={() => setIsEditingProductionTitle(true)}
                className="text-text-tertiary text-caption hover:text-text-secondary hover:underline transition-colors"
              >
                Not set (click to add)
              </button>
            ) : (
              <span className="text-text-tertiary italic">Not set</span>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 2 — Stats Bar                                             */}
      {/* ================================================================= */}
      <div className="border-b border-border bg-surface px-6 py-3">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 max-w-6xl">
          <StatCard
            icon={Target}
            label="Completion"
            value={`${stats.completionPct}%`}
            sub={`${stats.completedPoints}/${stats.totalPoints} SP`}
            valueColor={stats.completionPct > 0 ? 'text-green-500' : undefined}
          />
          <StatCard
            icon={TrendingUp}
            label="Velocity"
            value={`${stats.velocity} SP`}
            sub="per week avg"
          />
          <StatCard
            icon={CheckCircle2}
            label="Tasks"
            value={`${stats.completedTasks}/${stats.totalTasks}`}
            sub="completed"
          />
          <StatCard
            icon={BookOpen}
            label="Stories"
            value={`${stats.totalStories}`}
            sub={stats.blockedStories > 0 ? `${stats.blockedStories} blocked` : ''}
          />
          <StatCard
            icon={AlertTriangle}
            label="At Risk"
            value={`${stats.atRiskStories}`}
            sub="stories"
            valueColor={stats.atRiskStories > 0 ? 'text-yellow-500' : 'text-green-500'}
          />
          <StatCard
            icon={ShieldAlert}
            label="Blocked"
            value={`${stats.blockedStories}`}
            sub="stories"
            valueColor={stats.blockedStories > 0 ? 'text-red-500' : 'text-green-500'}
          />
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 3 — Team + Members Bar                                    */}
      {/* ================================================================= */}
      <div className="border-b border-border bg-surface px-6 py-2.5">
        <div className="flex items-center justify-between max-w-6xl">
          {/* Team selector */}
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <Popover open={teamOpen} onOpenChange={setTeamOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={teamOpen}
                    className="w-48 justify-between"
                    size="sm"
                  >
                    {selectedTeam ? (
                      <span className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: selectedTeam.color }}
                        />
                        {selectedTeam.name}
                      </span>
                    ) : (
                      <span className="text-text-tertiary">No team</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search teams..." />
                    <CommandList>
                      <CommandEmpty>No teams found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="" onSelect={() => handleTeamChange(null)}>
                          <Check className={cn('mr-2 h-4 w-4', teamId === null ? 'opacity-100' : 'opacity-0')} />
                          <span className="text-text-tertiary">No team</span>
                        </CommandItem>
                        {teams.map(team => (
                          <CommandItem
                            key={team.id}
                            value={team.name}
                            onSelect={() => handleTeamChange(team.id)}
                          >
                            <Check className={cn('mr-2 h-4 w-4', teamId === team.id ? 'opacity-100' : 'opacity-0')} />
                            <div className="mr-2 w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: team.color }} />
                            {team.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : selectedTeam ? (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: selectedTeam.color }} />
                <span className="text-body text-text-primary">{selectedTeam.name}</span>
              </div>
            ) : (
              <span className="text-body text-text-tertiary">No team</span>
            )}
          </div>

          {/* Member avatars + add */}
          <div className="flex items-center gap-1.5 relative">
            <TooltipProvider delayDuration={200}>
              <div className="flex -space-x-1.5">
                {members.slice(0, 10).map(member => {
                  const roleName = userRoleMap[member.user.id];
                  const tooltipLabel = `${member.user.name || member.user.email}${roleName ? ` — ${roleName}` : ' — Observer'}`;
                  return (
                    <Tooltip key={member.id}>
                      <TooltipTrigger asChild>
                        <Avatar
                          className="h-7 w-7 border-2 border-surface cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setMemberContextMenu({
                              memberId: member.id,
                              userId: member.user.id,
                              userName: member.user.name || member.user.email,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                        >
                          <AvatarImage src={member.user.image || undefined} />
                          <AvatarFallback className="text-tiny">
                            {(member.user.name || member.user.email)[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {tooltipLabel}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {members.length > 10 && (
                  <div className="h-7 w-7 rounded-full border-2 border-surface bg-surface-active flex items-center justify-center text-tiny font-medium text-text-secondary">
                    +{members.length - 10}
                  </div>
                )}
              </div>
            </TooltipProvider>

            {/* Member context menu */}
            {memberContextMenu && (
              <div
                ref={contextMenuRef}
                className="fixed z-50 min-w-[160px] rounded-md border border-border bg-surface p-1 shadow-md animate-in fade-in-0 zoom-in-95"
                style={{ left: memberContextMenu.x, top: memberContextMenu.y }}
              >
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-surface-hover transition-colors"
                  onClick={() => {
                    router.push(`/users/${memberContextMenu.userId}`);
                    setMemberContextMenu(null);
                  }}
                >
                  <User className="h-3.5 w-3.5" />
                  Open user page
                </button>
                {isAdmin && !memberContextMenu.memberId.startsWith('temp-') && (
                  <button
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                    onClick={() => {
                      handleRemoveMember(memberContextMenu.memberId);
                      setMemberContextMenu(null);
                    }}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    Remove from project
                  </button>
                )}
              </div>
            )}
            {isAdmin && (
              <Popover open={usersOpen} onOpenChange={setUsersOpen}>
                <PopoverTrigger asChild>
                  <button className="h-7 w-7 rounded-full border border-dashed border-border flex items-center justify-center text-text-tertiary hover:text-text-primary hover:border-text-primary transition-colors">
                    <UserPlus className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users available.</CommandEmpty>
                      <CommandGroup>
                        {availableUsers.map(user => (
                          <CommandItem
                            key={user.id}
                            value={user.name || user.email}
                            onSelect={() => handleAddMember(user.email)}
                          >
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback className="text-tiny">
                                {(user.name || user.email)[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span>{user.name || 'Unnamed'}</span>
                              <span className="text-tiny text-text-tertiary">{user.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {renderQualitySummary()}

      {/* ================================================================= */}
      {/* SECTION 4 — Three-Column Layout                                   */}
      {/* ================================================================= */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* ============================================================= */}
            {/* LEFT COLUMN — Roles Table (with avatars)                       */}
            {/* ============================================================= */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-text-secondary" />
                <h2 className="text-title font-medium text-text-secondary">Project Roles</h2>
              </div>

              {isAdmin && !rolesInfoDismissed && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 px-3 py-2">
                  <span className="text-caption text-blue-700 dark:text-blue-300 flex-1">
                    Not all members need a project role. Members without a role are considered <strong>observers</strong> by default and can still view the board.
                  </span>
                  <button
                    onClick={() => {
                      setRolesInfoDismissed(true);
                      localStorage.setItem(LS_KEY_DISMISS_ROLES_INFO, 'true');
                    }}
                    className="p-0.5 rounded text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-subtle">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-text-secondary">Role</th>
                      <th className="px-3 py-2 text-left font-medium text-text-secondary">User</th>
                      {isAdmin && (
                        <th className="px-3 py-2 w-10" />
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayRoles.map(row => {
                      const isDefault = row.id.startsWith('default-');
                      const member = row.userId ? membersById[row.userId] : null;

                      return (
                        <tr key={row.id} className="bg-surface">
                          <td className="px-3 py-2">
                            {isAdmin && !isDefault ? (
                              <select
                                value={row.roleId}
                                onChange={e => handleRoleRowChange(row.id, 'roleId', e.target.value)}
                                className="w-full rounded-md border border-border bg-surface px-2 py-1 text-body"
                              >
                                <option value="">Select role...</option>
                                {companyRoles.map(role => (
                                  <option key={role.id} value={role.id}>
                                    {role.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className="inline-flex rounded-full px-2 py-0.5 text-tiny font-medium"
                                style={{
                                  backgroundColor: `${row.roleColor || '#71717a'}22`,
                                  color: row.roleColor || '#71717a',
                                }}
                              >
                                {row.roleName || '\u2014'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isAdmin && !isDefault ? (
                              <UserPicker
                                members={members}
                                selectedUserId={row.userId}
                                onSelect={(userId) => handleRoleRowChange(row.id, 'userId', userId)}
                              />
                            ) : member ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={member.image || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {(member.name || member.email)[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-text-primary text-body">
                                  {member.name || member.email}
                                </span>
                              </div>
                            ) : (
                              <span className="text-text-tertiary">{isDefault ? '\u2014' : 'Removed member'}</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-3 py-2 text-center">
                              {!isDefault && (
                                <button
                                  onClick={() => handleDeleteRoleRow(row.id)}
                                  className="p-1 rounded text-text-tertiary hover:text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isAdmin && (
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={handleAddRoleRow} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add Row
                  </Button>
                  {projectRolesChanged && (
                    <Button onClick={handleSaveProjectRoles} disabled={isSavingProjectRoles} size="sm">
                      {isSavingProjectRoles ? 'Saving...' : 'Save Roles'}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* ============================================================= */}
            {/* MIDDLE COLUMN — Description + Links                            */}
            {/* ============================================================= */}
            <div className="space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <h2 className="text-title font-medium text-text-secondary">Description</h2>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Project description..."
                  className="min-h-[80px] resize-y"
                />
                {isAdmin && descriptionChanged && (
                  <div className="flex justify-end">
                    <Button onClick={handleSaveDescription} disabled={isSavingDescription} size="sm">
                      {isSavingDescription ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Links */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-text-secondary" />
                  <h2 className="text-title font-medium text-text-secondary">Links</h2>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-2.5">
                  {/* Auto-generated internal links */}
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-medium text-text-secondary w-40">Spine</span>
                    <Link
                      href={`/boards/${board.id}?view=spine`}
                      className="text-body text-primary hover:underline truncate"
                    >
                      Open Spine Tracker
                    </Link>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-medium text-text-secondary w-40">Board</span>
                    <Link
                      href={`/boards/${board.id}`}
                      className="text-body text-primary hover:underline truncate"
                    >
                      Open Board
                    </Link>
                  </div>

                  <div className="border-t border-border my-2" />

                  {/* Editable external links */}
                  <EditableLinkRow
                    label="OneDrive"
                    value={oneDriveUrl}
                    onChange={setOneDriveUrl}
                    disabled={!isAdmin}
                  />
                  <EditableLinkRow
                    label="Game Spec"
                    value={gameSpecUrl}
                    onChange={setGameSpecUrl}
                    disabled={!isAdmin}
                  />
                  <EditableLinkRow
                    label="Game Sheet"
                    value={gameSheetUrl}
                    onChange={setGameSheetUrl}
                    disabled={!isAdmin}
                  />

                  {isAdmin && linksChanged && (
                    <div className="flex justify-end pt-1">
                      <Button onClick={handleSaveLinks} disabled={isSavingLinks} size="sm">
                        {isSavingLinks ? 'Saving...' : 'Save Links'}
                      </Button>
                    </div>
                  )}

                  <div className="border-t border-border my-2" />

                  {/* Slack channel */}
                  <div className="flex items-center gap-3">
                    <span className="text-caption font-medium text-text-secondary w-24 shrink-0">Slack</span>
                    {isAdmin && slackChannels.length > 0 ? (
                      <Popover open={slackChannelOpen} onOpenChange={setSlackChannelOpen}>
                        <PopoverTrigger asChild>
                          <button
                            className={cn(
                              'flex items-center gap-1.5 flex-1 rounded-md border border-border px-3 py-1.5 text-body text-left',
                              slackChannelId ? 'text-text-primary' : 'text-text-tertiary'
                            )}
                            disabled={isSavingSlackChannel}
                          >
                            {slackChannelId ? (
                              <>
                                <Hash className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                                <span className="truncate">{slackChannelName || slackChannelId}</span>
                              </>
                            ) : (
                              <span>Select channel...</span>
                            )}
                            <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="end">
                          <Command>
                            <CommandInput placeholder="Search channels..." />
                            <CommandList>
                              <CommandEmpty>
                                No channels found. For private channels, invite the Slack app first.
                              </CommandEmpty>
                              <CommandGroup>
                                {slackChannelId && (
                                  <CommandItem
                                    onSelect={() => {
                                      setSlackChannelId('');
                                      setSlackChannelName('');
                                      setSlackChannelOpen(false);
                                      handleSaveSlackChannel('', '');
                                    }}
                                    className="text-text-tertiary"
                                  >
                                    <X className="mr-2 h-3.5 w-3.5" />
                                    Remove channel
                                  </CommandItem>
                                )}
                                {slackChannels.map((ch) => (
                                  <CommandItem
                                    key={ch.id}
                                    value={`${ch.name} ${ch.name.replace(/[-_]/g, ' ')} ${ch.id}`}
                                    onSelect={() => {
                                      setSlackChannelId(ch.id);
                                      setSlackChannelName(ch.name);
                                      setSlackChannelOpen(false);
                                      handleSaveSlackChannel(ch.id, ch.name);
                                    }}
                                  >
                                    {ch.isPrivate ? (
                                      <Lock className="mr-2 h-3.5 w-3.5 text-text-tertiary" />
                                    ) : (
                                      <Hash className="mr-2 h-3.5 w-3.5 text-text-tertiary" />
                                    )}
                                    <span className="truncate">{ch.name}</span>
                                    {ch.id === slackChannelId && (
                                      <Check className="ml-auto h-3.5 w-3.5 text-primary" />
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : slackChannelId ? (
                      <span className="text-body text-text-primary flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-text-secondary" />
                        {slackChannelName || slackChannelId}
                      </span>
                    ) : (
                      <span className="text-body text-text-tertiary">Not connected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* RIGHT COLUMN — Dates                                           */}
            {/* ============================================================= */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-text-secondary" />
                <h2 className="text-title font-medium text-text-secondary">Dates</h2>
              </div>

              {isAdmin && !datesInfoDismissed && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 px-3 py-2">
                  <span className="text-caption text-blue-700 dark:text-blue-300 flex-1">
                    Project dates can be set here or managed from the <strong>Timeline</strong> view. Changes sync automatically.
                  </span>
                  <button
                    onClick={() => {
                      setDatesInfoDismissed(true);
                      localStorage.setItem(LS_KEY_DISMISS_DATES_INFO, 'true');
                    }}
                    className="p-0.5 rounded text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="rounded-lg border border-border p-4 space-y-3">
                {/* Auto-calculated dates from TWEAK blocks */}
                {calculatedDates.lastTweak && (
                  <CalculatedDateRow
                    label="Last Tweak"
                    calculatedDate={calculatedDates.lastTweak}
                    overrideDate={lastTweakOverride}
                    isEditing={editingTweakOverride}
                    isAdmin={isAdmin}
                    onStartEditing={() => setEditingTweakOverride(true)}
                    onCancel={() => {
                      setEditingTweakOverride(false);
                      setLastTweakOverride(board.settings.lastTweakOverride || '');
                    }}
                    onChangeOverride={setLastTweakOverride}
                    onSave={() => handleSaveOverride('lastTweakOverride', lastTweakOverride)}
                    onClearOverride={() => {
                      setLastTweakOverride('');
                      handleSaveOverride('lastTweakOverride', '');
                    }}
                  />
                )}
                {calculatedDates.lastStaticArt && (
                  <CalculatedDateRow
                    label="Last Static Assets"
                    calculatedDate={calculatedDates.lastStaticArt}
                    overrideDate={lastStaticArtOverride}
                    isEditing={editingStaticArtOverride}
                    isAdmin={isAdmin}
                    onStartEditing={() => setEditingStaticArtOverride(true)}
                    onCancel={() => {
                      setEditingStaticArtOverride(false);
                      setLastStaticArtOverride(board.settings.lastStaticArtOverride || '');
                    }}
                    onChangeOverride={setLastStaticArtOverride}
                    onSave={() => handleSaveOverride('lastStaticArtOverride', lastStaticArtOverride)}
                    onClearOverride={() => {
                      setLastStaticArtOverride('');
                      handleSaveOverride('lastStaticArtOverride', '');
                    }}
                  />
                )}

                {(calculatedDates.lastTweak || calculatedDates.lastStaticArt) && dateRows.length > 0 && (
                  <div className="border-t border-border my-1" />
                )}

                {/* Event-based date rows */}
                {dateRows.map(({ eventTypeName, event, eventType }) => (
                  <EventDateRow
                    key={eventTypeName}
                    label={eventTypeName}
                    event={event}
                    eventType={eventType}
                    isAdmin={isAdmin}
                    onSetDate={handleSetEventDate}
                    onUpdateDate={handleUpdateEventDate}
                    onDelete={handleDeleteEvent}
                  />
                ))}

                {/* Add date button */}
                {isAdmin && unusedEventTypes.length > 0 && (
                  <div className="pt-1">
                    <Popover open={addDateOpen} onOpenChange={setAddDateOpen}>
                      <PopoverTrigger asChild>
                        <button className="text-caption text-text-tertiary hover:text-text-primary flex items-center gap-1">
                          <Plus className="h-3.5 w-3.5" />
                          Add date
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search event types..." />
                          <CommandList>
                            <CommandEmpty>No event types available.</CommandEmpty>
                            <CommandGroup>
                              {unusedEventTypes.map(et => (
                                <CommandItem
                                  key={et.id}
                                  value={et.name}
                                  onSelect={() => handleAddEventType(et)}
                                >
                                  <div
                                    className="mr-2 w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: et.color }}
                                  />
                                  {et.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function CalculatedDateRow({
  label,
  calculatedDate,
  overrideDate,
  isEditing,
  isAdmin,
  onStartEditing,
  onCancel,
  onChangeOverride,
  onSave,
  onClearOverride,
}: {
  label: string;
  calculatedDate: string;
  overrideDate: string;
  isEditing: boolean;
  isAdmin: boolean;
  onStartEditing: () => void;
  onCancel: () => void;
  onChangeOverride: (v: string) => void;
  onSave: () => void;
  onClearOverride: () => void;
}) {
  const displayDate = overrideDate || calculatedDate;
  const isOverridden = !!overrideDate;

  if (isEditing) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-caption font-medium text-text-secondary flex-1">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={overrideDate || calculatedDate}
            onChange={e => onChangeOverride(e.target.value)}
            className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-body text-text-primary"
          />
          <button onClick={onSave} className="p-1 rounded text-green-600 hover:bg-green-500/10">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={onCancel} className="p-1 rounded text-text-tertiary hover:bg-surface-hover">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-caption font-medium text-text-secondary flex-1">{label}</span>
      <span className="text-body text-text-primary">{formatDate(displayDate)}</span>
      {!isOverridden && (
        <span className="text-[10px] text-text-tertiary flex items-center gap-0.5" title="Auto-calculated from TWEAK blocks">
          <Calculator className="h-3 w-3" />
        </span>
      )}
      {isAdmin && (
        <>
          <button
            onClick={onStartEditing}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-hover"
            title={isOverridden ? 'Edit override' : 'Override calculated date'}
          >
            <Pencil className="h-3 w-3" />
          </button>
          {isOverridden && (
            <button
              onClick={onClearOverride}
              className="p-1 rounded text-text-tertiary hover:text-red-500 hover:bg-red-500/10"
              title="Remove override (use calculated)"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

function EventDateRow({
  label,
  event,
  eventType,
  isAdmin,
  onSetDate,
  onUpdateDate,
  onDelete,
}: {
  label: string;
  event: TimelineEventData | null;
  eventType: EventTypeInfo | null;
  isAdmin: boolean;
  onSetDate: (eventTypeId: string, eventTypeName: string, date: string) => void;
  onUpdateDate: (eventId: string, date: string) => void;
  onDelete: (eventId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [dateValue, setDateValue] = useState('');
  const color = event?.eventType.color || eventType?.color || '#71717a';

  if (event) {
    const dateStr = parseApiDate(event.startDate);

    // Editing mode — show date input
    if (isEditing && isAdmin) {
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-caption font-medium text-text-secondary">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateValue || dateStr}
              onChange={e => setDateValue(e.target.value)}
              className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-body text-text-primary"
              autoFocus
            />
            <button
              onClick={() => {
                const newDate = dateValue || dateStr;
                if (newDate && newDate !== dateStr) onUpdateDate(event.id, newDate);
                setIsEditing(false);
                setDateValue('');
              }}
              className="p-1 rounded text-green-600 hover:bg-green-500/10"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setIsEditing(false); setDateValue(''); }}
              className="p-1 rounded text-text-tertiary hover:bg-surface-hover"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      );
    }

    // Display mode — formatted text
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-caption font-medium text-text-secondary truncate">{label}</span>
        </div>
        <span className="text-body text-text-primary">{formatDate(dateStr)}</span>
        {isAdmin && (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-hover"
              title="Edit date"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={() => onDelete(event.id)}
              className="p-1 rounded text-text-tertiary hover:text-red-500 hover:bg-red-500/10"
              title="Remove date"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    );
  }

  // No event yet — setting date mode
  if (isEditing && eventType) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-caption font-medium text-text-secondary">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateValue}
            onChange={e => setDateValue(e.target.value)}
            className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-body text-text-primary"
            autoFocus
          />
          <button
            onClick={() => {
              if (dateValue) {
                onSetDate(eventType.id, eventType.name, dateValue);
                setIsEditing(false);
                setDateValue('');
              }
            }}
            disabled={!dateValue}
            className="p-1 rounded text-green-600 hover:bg-green-500/10 disabled:opacity-30"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setIsEditing(false); setDateValue(''); }}
            className="p-1 rounded text-text-tertiary hover:bg-surface-hover"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // No event, not editing — show "Set date" or "Not set"
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <div className="w-2 h-2 rounded-full shrink-0 opacity-40" style={{ backgroundColor: color }} />
        <span className="text-caption font-medium text-text-tertiary truncate">{label}</span>
      </div>
      {isAdmin && eventType ? (
        <button
          onClick={() => setIsEditing(true)}
          className="text-caption text-primary hover:underline"
        >
          Set date
        </button>
      ) : (
        <span className="text-caption text-text-tertiary">Not set</span>
      )}
    </div>
  );
}

function EditableLinkRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-caption font-medium text-text-secondary w-24 shrink-0">
        {label}
      </span>
      {disabled ? (
        value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body text-primary hover:underline truncate"
          >
            {value}
          </a>
        ) : (
          <span className="text-body text-text-tertiary">Not set</span>
        )
      ) : (
        <input
          type="url"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://..."
          className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-body text-text-primary"
        />
      )}
    </div>
  );
}

/** Convert an API ISO date string (UTC) to a local YYYY-MM-DD string. */
function parseApiDate(isoStr: string): string {
  const date = new Date(isoStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format a YYYY-MM-DD string as "Month Day" (e.g., "July 8"). */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
