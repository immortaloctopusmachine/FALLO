'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Layers,
  Building2,
  Gauge,
  ChevronDown,
  ChevronRight,
  Hash,
  Lock,
  ChevronsUpDown,
  Check,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTeam } from '@/hooks/api/use-teams';
import type { TeamDetailMember } from '@/hooks/api/use-teams';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { BoardCard } from '@/components/boards/BoardCard';
import { TeamSettingsButton } from '@/components/organization/TeamSettingsButton';
import { TeamDetailSkeleton } from '@/components/organization/TeamDetailSkeleton';
import type { TeamSettings } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamDetailClientProps {
  teamId: string;
  currentUserId: string;
  isAdmin: boolean;
  canViewQualitySummaries: boolean;
}

interface CompanyRoleOption {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

interface TeamRoleAssignment {
  id: string;
  roleId: string;
  roleName: string;
  roleColor?: string | null;
  userId: string;
}

interface TeamQualitySummary {
  totals: {
    projectCount: number;
    doneTaskCount: number;
    finalizedTaskCount: number;
    overallAverage: number | null;
    overallQualityTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';
  };
  projects: Array<{
    projectId: string;
    projectName: string;
    doneTaskCount: number;
    finalizedTaskCount: number;
    coveragePct: number | null;
    overallAverage: number | null;
    overallQualityTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_ROLE_NAMES = ['MATH', 'PO', 'LEAD', 'DEV', 'ARTIST', 'ANIMATOR', 'QA'];

function UserPicker({
  members,
  selectedUserId,
  onSelect,
}: {
  members: TeamDetailMember[];
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
// Main Component
// ---------------------------------------------------------------------------

export function TeamDetailClient({
  teamId,
  currentUserId,
  isAdmin,
  canViewQualitySummaries,
}: TeamDetailClientProps) {
  const queryClient = useQueryClient();
  const { data: team, isLoading } = useTeam(teamId);
  const [qualitySummaryExpanded, setQualitySummaryExpanded] = useState(false);

  // ---- Slack state ----
  const [slackChannelId, setSlackChannelId] = useState('');
  const [slackChannelName, setSlackChannelName] = useState('');
  const [slackChannels, setSlackChannels] = useState<{ id: string; name: string; isPrivate: boolean }[]>([]);
  const [slackChannelOpen, setSlackChannelOpen] = useState(false);
  const [isSavingSlackChannel, setIsSavingSlackChannel] = useState(false);

  // ---- Role assignments state ----
  const [teamRoleAssignments, setTeamRoleAssignments] = useState<TeamRoleAssignment[]>([]);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  // ---- Company roles ----
  const { data: companyRoles } = useQuery({
    queryKey: ['settings', 'roles'],
    queryFn: () => apiFetch<CompanyRoleOption[]>('/api/settings/roles'),
  });

  // ---- Quality summary ----
  const {
    data: qualitySummary,
    isLoading: isLoadingQualitySummary,
  } = useQuery({
    queryKey: ['metrics', 'teams', teamId, 'quality-summary'],
    queryFn: () => apiFetch<TeamQualitySummary>(`/api/metrics/teams/${teamId}/quality-summary`),
    enabled: Boolean(teamId) && canViewQualitySummaries,
    retry: false,
  });

  // ---- Sync state from team data ----
  useEffect(() => {
    if (!team) return;
    const s = (team.settings as TeamSettings) || {};
    setSlackChannelId(s.slackChannelId || '');
    setSlackChannelName(s.slackChannelName || '');
    setTeamRoleAssignments(s.teamRoleAssignments || []);
  }, [team]);

  // ---- Fetch Slack channels for admin ----
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
        // Slack not configured
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  // ---- Derived data ----
  const settings: TeamSettings = useMemo(() => {
    return (team?.settings as TeamSettings) || {};
  }, [team]);

  const membersById = useMemo(() => {
    if (!team) return {} as Record<string, TeamDetailMember['user']>;
    const map: Record<string, TeamDetailMember['user']> = {};
    for (const m of team.members) map[m.user.id] = m.user;
    return map;
  }, [team]);

  const displayRoles = useMemo(() => {
    if (teamRoleAssignments.length > 0) return teamRoleAssignments;
    return DEFAULT_ROLE_NAMES.map((name, i) => ({
      id: `default-${i}`,
      roleId: '',
      roleName: name,
      roleColor: null as string | null,
      userId: '',
    }));
  }, [teamRoleAssignments]);

  // Match default placeholder names to company roles for pre-selecting in dropdown
  const defaultRoleMatch = useMemo(() => {
    const map: Record<string, string> = {};
    if (!companyRoles) return map;
    for (const name of DEFAULT_ROLE_NAMES) {
      const match = companyRoles.find(r => r.name.toUpperCase() === name);
      if (match) map[name] = match.id;
    }
    return map;
  }, [companyRoles]);

  const rolesChanged = useMemo(() => {
    const currentSettings = (team?.settings as TeamSettings) || {};
    return JSON.stringify(teamRoleAssignments) !== JSON.stringify(currentSettings.teamRoleAssignments || []);
  }, [teamRoleAssignments, team]);

  // ---- Handlers ----

  const handleSaveSlackChannel = async (channelId: string, channelName: string) => {
    if (!team) return;
    setIsSavingSlackChannel(true);
    try {
      const updatedSettings: TeamSettings = {
        ...settings,
        slackChannelId: channelId || undefined,
        slackChannelName: channelName || undefined,
      };
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
      }
    } catch (err) {
      console.error('Failed to save Slack channel:', err);
    } finally {
      setIsSavingSlackChannel(false);
    }
  };

  // Promote ALL default placeholder rows to real editable rows at once
  const promoteAllDefaults = (): { rows: TeamRoleAssignment[]; idMap: Record<string, string> } => {
    const idMap: Record<string, string> = {};
    const rows = DEFAULT_ROLE_NAMES.map((name, i) => {
      const newId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`;
      idMap[`default-${i}`] = newId;
      const matchedRoleId = defaultRoleMatch[name] || '';
      const matchedRole = (companyRoles || []).find(r => r.id === matchedRoleId);
      return {
        id: newId,
        roleId: matchedRoleId,
        roleName: matchedRole?.name || name,
        roleColor: matchedRole?.color || null,
        userId: '',
      };
    });
    return { rows, idMap };
  };

  const handleRoleRowChange = (
    rowId: string,
    field: 'roleId' | 'userId',
    value: string
  ) => {
    setTeamRoleAssignments(prev => {
      let working = prev;
      let effectiveRowId = rowId;

      // Promote all default rows on first edit of any default
      if (rowId.startsWith('default-')) {
        const { rows, idMap } = promoteAllDefaults();
        working = rows;
        effectiveRowId = idMap[rowId] || rowId;
      }

      const row = working.find(r => r.id === effectiveRowId);
      if (!row) return prev;

      const isDuplicate = (roleId: string, userId: string) =>
        working.some(r => r.roleId === roleId && r.userId === userId && r.id !== effectiveRowId);

      if (field === 'roleId') {
        const role = (companyRoles || []).find(r => r.id === value);
        if (!role) return working;
        if (row.userId && isDuplicate(value, row.userId)) return working;
        return working.map(r =>
          r.id === effectiveRowId
            ? { ...r, roleId: role.id, roleName: role.name, roleColor: role.color }
            : r
        );
      } else {
        if (row.roleId && isDuplicate(row.roleId, value)) return working;
        return working.map(r => (r.id === effectiveRowId ? { ...r, userId: value } : r));
      }
    });
  };

  const handleAddRoleRow = () => {
    const rowId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setTeamRoleAssignments(prev => [
      ...prev,
      { id: rowId, roleId: '', roleName: '', roleColor: null, userId: '' },
    ]);
  };

  const handleDeleteRoleRow = (rowId: string) => {
    setTeamRoleAssignments(prev => prev.filter(r => r.id !== rowId));
  };

  const handleSaveRoles = async () => {
    if (!team) return;
    setIsSavingRoles(true);
    try {
      const validAssignments = teamRoleAssignments.filter(r => r.roleId && r.userId);
      const updatedSettings: TeamSettings = {
        ...settings,
        teamRoleAssignments: validAssignments,
      };
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
      }
    } catch (err) {
      console.error('Failed to save team roles:', err);
    } finally {
      setIsSavingRoles(false);
    }
  };

  // ---- Loading ----
  if (isLoading || !team) return <TeamDetailSkeleton />;

  const isAdminForBoard = (board: typeof team.boards[0]) => {
    const membership = board.members.find((m) => m.userId === currentUserId);
    return membership?.permission === 'ADMIN' || membership?.permission === 'SUPER_ADMIN';
  };

  const qualityTierClass = (tier: TeamQualitySummary['totals']['overallQualityTier']) => {
    if (tier === 'HIGH') return 'text-green-600';
    if (tier === 'MEDIUM') return 'text-amber-600';
    if (tier === 'LOW') return 'text-red-600';
    return 'text-text-tertiary';
  };

  const renderQualitySummary = () => {
    if (!canViewQualitySummaries) return null;

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
                    <div className="rounded-md border border-border-subtle bg-background p-3">
                      <div className="text-caption text-text-tertiary">Overall</div>
                      <div className={cn('text-title font-semibold mt-1', qualityTierClass(qualitySummary.totals.overallQualityTier))}>
                        {qualitySummary.totals.overallAverage !== null
                          ? qualitySummary.totals.overallAverage.toFixed(2)
                          : 'Unscored'}
                      </div>
                      <div className="text-caption text-text-tertiary">{qualitySummary.totals.overallQualityTier}</div>
                    </div>
                    <div className="rounded-md border border-border-subtle bg-background p-3">
                      <div className="text-caption text-text-tertiary">Projects</div>
                      <div className="text-title font-semibold mt-1 text-text-primary">{qualitySummary.totals.projectCount}</div>
                    </div>
                    <div className="rounded-md border border-border-subtle bg-background p-3">
                      <div className="text-caption text-text-tertiary">Done Tasks</div>
                      <div className="text-title font-semibold mt-1 text-text-primary">{qualitySummary.totals.doneTaskCount}</div>
                    </div>
                    <div className="rounded-md border border-border-subtle bg-background p-3">
                      <div className="text-caption text-text-tertiary">Finalized</div>
                      <div className="text-title font-semibold mt-1 text-text-primary">
                        {qualitySummary.totals.finalizedTaskCount}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border border-border-subtle bg-background overflow-hidden">
                    {qualitySummary.projects.length === 0 ? (
                      <div className="p-3 text-caption text-text-tertiary">No project data yet.</div>
                    ) : (
                      <div className="divide-y divide-border-subtle">
                        {qualitySummary.projects.map((project) => (
                          <Link
                            key={project.projectId}
                            href={`/projects/${project.projectId}`}
                            className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-surface-hover transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-body font-medium text-text-primary">
                                {project.projectName}
                              </div>
                              <div className="text-caption text-text-tertiary">
                                coverage {project.coveragePct !== null ? `${project.coveragePct.toFixed(1)}%` : 'N/A'} | {project.finalizedTaskCount}/{project.doneTaskCount}
                              </div>
                            </div>
                            <div className={cn('text-body font-medium shrink-0', qualityTierClass(project.overallQualityTier))}>
                              {project.overallAverage !== null ? project.overallAverage.toFixed(2) : 'N/A'}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-body text-text-tertiary">Quality summary unavailable.</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* ================================================================= */}
      {/* SECTION 1 — Banner                                                */}
      {/* ================================================================= */}
      <div
        className="h-24"
        style={{
          backgroundImage: team.image ? `url(${team.image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: !team.image ? team.color : undefined,
        }}
      />

      {/* ================================================================= */}
      {/* SECTION 2 — Header: name, breadcrumbs, stats, Slack, settings     */}
      {/* ================================================================= */}
      <div className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 -mt-10 shrink-0 items-center justify-center rounded-xl border-4 border-surface text-white"
              style={{ backgroundColor: team.color }}
            >
              <Users className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-caption text-text-tertiary">
                {team.studio ? (
                  <>
                    <Link href="/studios" className="hover:text-text-secondary">
                      Studios
                    </Link>
                    <span>/</span>
                    <Link href={`/studios/${team.studio.id}`} className="hover:text-text-secondary">
                      {team.studio.name}
                    </Link>
                    <span>/</span>
                  </>
                ) : (
                  <>
                    <Link href="/teams" className="hover:text-text-secondary">
                      Teams
                    </Link>
                    <span>/</span>
                  </>
                )}
              </div>
              <h1 className="text-heading font-semibold">{team.name}</h1>
              {team.description && (
                <p className="mt-1 text-body text-text-secondary max-w-2xl">
                  {team.description}
                </p>
              )}
            </div>
          </div>
          {isAdmin && (
            <TeamSettingsButton
              team={{
                id: team.id,
                name: team.name,
                description: team.description,
                image: team.image,
                color: team.color,
                studio: team.studio,
                members: team.members.map((m) => ({
                  id: m.id,
                  permission: m.permission,
                  title: m.title,
                  user: {
                    id: m.user.id,
                    name: m.user.name,
                    email: m.user.email,
                    image: m.user.image,
                  },
                })),
              }}
            />
          )}
        </div>

        {/* Stats bar: members, boards, studio, slack */}
        <div className="mt-4 flex items-center gap-6 text-body flex-wrap">
          <div>
            <span className="font-semibold text-text-primary">{team._count.members}</span>
            <span className="text-text-secondary ml-1">members</span>
          </div>
          <div>
            <span className="font-semibold text-text-primary">{team._count.boards}</span>
            <span className="text-text-secondary ml-1">boards</span>
          </div>
          {team.studio && (
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Building2 className="h-4 w-4" />
              <Link href={`/studios/${team.studio.id}`} className="hover:text-text-primary">
                {team.studio.name}
              </Link>
            </div>
          )}

          {/* Slack channel (display / picker) */}
          {isAdmin && slackChannels.length > 0 ? (
            <Popover open={slackChannelOpen} onOpenChange={setSlackChannelOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-body transition-colors hover:bg-surface-hover',
                    slackChannelId ? 'text-text-primary' : 'text-text-tertiary'
                  )}
                  disabled={isSavingSlackChannel}
                >
                  <Hash className="h-3.5 w-3.5 text-text-secondary" />
                  <span className="truncate max-w-[160px]">
                    {slackChannelId ? (slackChannelName || slackChannelId) : 'Connect Slack'}
                  </span>
                  <ChevronsUpDown className="h-3 w-3 shrink-0 text-text-tertiary" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
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
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Hash className="h-3.5 w-3.5" />
              <span>{slackChannelName || slackChannelId}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 3 — Members avatar bar                                    */}
      {/* ================================================================= */}
      <div className="border-b border-border bg-surface px-6 py-2.5">
        <div className="flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-2 text-caption text-text-secondary">
            <Users className="h-4 w-4" />
            <span className="font-medium">Members</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              {team.members.slice(0, 10).map(({ user: member }) => (
                <Link key={member.id} href={`/users/${member.id}`}>
                  <Avatar className="h-7 w-7 border-2 border-surface cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback className="text-tiny">
                      {(member.name || member.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              ))}
              {team.members.length > 10 && (
                <div className="h-7 w-7 rounded-full border-2 border-surface bg-surface-active flex items-center justify-center text-tiny font-medium text-text-secondary">
                  +{team.members.length - 10}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {renderQualitySummary()}

      {/* ================================================================= */}
      {/* SECTION 4 — Content: Roles table + Boards                         */}
      {/* ================================================================= */}
      <main className="p-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* ============================================================= */}
          {/* LEFT COLUMN — Roles Table                                      */}
          {/* ============================================================= */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-text-secondary" />
              <h2 className="text-title font-medium text-text-secondary">Team Roles</h2>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-subtle">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">Role</th>
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">User</th>
                    {isAdmin && <th className="px-3 py-2 w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayRoles.map(row => {
                    const isDefault = row.id.startsWith('default-');
                    const member = row.userId ? membersById[row.userId] : null;

                    return (
                      <tr key={row.id} className="bg-surface">
                        <td className="px-3 py-2">
                          {isAdmin ? (
                            <select
                              value={isDefault ? (defaultRoleMatch[row.roleName] || '') : row.roleId}
                              onChange={e => handleRoleRowChange(row.id, 'roleId', e.target.value)}
                              className="w-full rounded-md border border-border bg-surface px-2 py-1 text-body"
                            >
                              <option value="">Select role...</option>
                              {(companyRoles || []).map(role => (
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
                          {isAdmin ? (
                            <UserPicker
                              members={team.members}
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
                {rolesChanged && (
                  <Button onClick={handleSaveRoles} disabled={isSavingRoles} size="sm">
                    {isSavingRoles ? 'Saving...' : 'Save Roles'}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* RIGHT COLUMNS — Boards                                         */}
          {/* ============================================================= */}
          <div className="lg:col-span-2">
            <h2 className="text-title font-medium text-text-secondary mb-4">
              Boards ({team.boards.length})
            </h2>
            {team.boards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <Layers className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
                <h3 className="text-title text-text-secondary">No boards yet</h3>
                <p className="mt-2 text-body text-text-tertiary">
                  Create a board and assign it to this team.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {team.boards.map((board) => (
                  <BoardCard
                    key={board.id}
                    id={board.id}
                    name={board.name}
                    description={board.description}
                    listCount={board.lists.length}
                    memberCount={board.members.length}
                    isTemplate={board.isTemplate}
                    isAdmin={isAdminForBoard(board)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
