'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Mail,
  Calendar,
  Users,
  Layers,
  Sparkles,
  Pencil,
  Shield,
  Clock,
  Gauge,
  TrendingUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TeamCard } from '@/components/organization/TeamCard';
import { EditUserDialog } from './EditUserDialog';
import { UserDetailSkeleton } from './UserDetailSkeleton';
import { useUserDetail } from '@/hooks/api/use-users';
import { formatDisplayDate } from '@/lib/date-utils';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface UserDetailClientProps {
  userId: string;
  isSuperAdmin: boolean;
  canManageSlackLink: boolean;
  canViewQualitySummaries: boolean;
}

interface SlackUserOption {
  id: string;
  realName: string;
  displayName: string;
  image192: string | null;
  email: string | null;
}

interface UserQualitySummary {
  totals: {
    finalizedTaskCount: number;
    overallAverage: number | null;
    overallQualityTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';
  };
  progression: Array<{
    cycleId: string;
    cycleNumber: number;
    cardId: string;
    cardTitle: string;
    boardId: string;
    boardName: string;
    finalizedAt: string;
    weekStart: string;
    overallAverage: number | null;
    qualityTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';
  }>;
  perDimension: Array<{
    dimensionId: string;
    name: string;
    average: number | null;
    count: number;
    confidence: 'GREEN' | 'AMBER' | 'RED';
  }>;
  latestFinalizedTasks: Array<{
    cycleId: string;
    cardId: string;
    cardTitle: string;
    boardId: string;
    boardName: string;
    finalizedAt: string;
    overallAverage: number | null;
    qualityTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';
  }>;
}

export function UserDetailClient({
  userId,
  isSuperAdmin,
  canManageSlackLink,
  canViewQualitySummaries,
}: UserDetailClientProps) {
  const { data, isLoading } = useUserDetail(userId);
  const {
    data: qualitySummary,
    isLoading: isLoadingQualitySummary,
  } = useQuery({
    queryKey: ['metrics', 'users', userId, 'quality-summary'],
    queryFn: () => apiFetch<UserQualitySummary>(`/api/metrics/users/${userId}/quality-summary`),
    enabled: Boolean(userId) && canViewQualitySummaries,
    retry: false,
  });
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [slackUsers, setSlackUsers] = useState<SlackUserOption[]>([]);
  const [selectedSlackUserId, setSelectedSlackUserId] = useState('');
  const [slackSearch, setSlackSearch] = useState('');
  const [isLoadingSlackUsers, setIsLoadingSlackUsers] = useState(false);
  const [isSavingSlackLink, setIsSavingSlackLink] = useState(false);
  const [slackError, setSlackError] = useState<string | null>(null);
  const [qualitySummaryExpanded, setQualitySummaryExpanded] = useState(false);
  const currentlyLinkedSlackUserId = data?.user.slackUserId || '';

  const loadSlackUsers = useCallback(async () => {
    if (!canManageSlackLink) return;

    setIsLoadingSlackUsers(true);
    setSlackError(null);
    try {
      const response = await fetch('/api/integrations/slack/users');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load Slack users');
      }
      if (Array.isArray(result.data)) {
        setSlackUsers(result.data as SlackUserOption[]);
      } else {
        setSlackUsers([]);
      }
    } catch (error) {
      setSlackError(error instanceof Error ? error.message : 'Failed to load Slack users');
      setSlackUsers([]);
    } finally {
      setIsLoadingSlackUsers(false);
    }
  }, [canManageSlackLink]);

  useEffect(() => {
    setSelectedSlackUserId(currentlyLinkedSlackUserId);
  }, [currentlyLinkedSlackUserId]);

  useEffect(() => {
    void loadSlackUsers();
  }, [loadSlackUsers]);

  const filteredSlackUsers = useMemo(() => {
    const query = slackSearch.trim().toLowerCase();
    if (!query) return slackUsers;
    return slackUsers.filter((slackUser) => {
      const fields = [
        slackUser.displayName,
        slackUser.realName,
        slackUser.email || '',
      ].map((value) => value.toLowerCase());
      return fields.some((field) => field.includes(query));
    });
  }, [slackSearch, slackUsers]);

  const hasSlackSelectionChanges = selectedSlackUserId !== currentlyLinkedSlackUserId;

  const selectedSlackUser =
    slackUsers.find((slackUser) => slackUser.id === selectedSlackUserId) || null;

  const qualityTierClass = (tier: UserQualitySummary['totals']['overallQualityTier']) => {
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

  const handleSaveSlackLink = async () => {
    if (!data) return;
    if (!hasSlackSelectionChanges) return;

    setIsSavingSlackLink(true);
    setSlackError(null);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackUserId: selectedSlackUserId || null,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update Slack profile link');
      }

      await queryClient.invalidateQueries({ queryKey: ['users', userId, 'detail'] });
    } catch (error) {
      setSlackError(error instanceof Error ? error.message : 'Failed to update Slack profile link');
    } finally {
      setIsSavingSlackLink(false);
    }
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
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-border-subtle bg-background p-3">
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
                    <div className="rounded-md border border-border-subtle bg-background p-3">
                      <div className="text-caption text-text-tertiary">Finalized Tasks</div>
                      <div className="text-title font-semibold mt-1 text-text-primary">
                        {qualitySummary.totals.finalizedTaskCount}
                      </div>
                      <div className="text-caption text-text-tertiary">with final quality scores</div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-caption font-medium text-text-secondary">
                      <TrendingUp className="h-4 w-4" />
                      Per Dimension
                    </div>
                    <div className="space-y-2">
                      {qualitySummary.perDimension.map((dimension) => (
                        <div key={dimension.dimensionId} className="flex items-center justify-between rounded-md border border-border-subtle bg-background px-2 py-2">
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

                  <div>
                    <div className="mb-2 text-caption font-medium text-text-secondary">Progression</div>
                    <div className="space-y-2">
                      {qualitySummary.progression.slice(-6).map((point) => (
                        <div key={point.cycleId} className="flex items-center justify-between rounded-md border border-border-subtle bg-background px-2 py-2">
                          <div className="text-body text-text-primary">
                            {point.weekStart} - Cycle #{point.cycleNumber}
                          </div>
                          <div className={cn('text-body font-medium', qualityTierClass(point.qualityTier))}>
                            {point.overallAverage !== null ? point.overallAverage.toFixed(2) : 'N/A'}
                          </div>
                        </div>
                      ))}
                      {qualitySummary.progression.length === 0 && (
                        <div className="text-caption text-text-tertiary">No progression data yet.</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-caption font-medium text-text-secondary">Latest Final Scores</div>
                    <div className="space-y-2">
                      {qualitySummary.latestFinalizedTasks.slice(0, 5).map((task) => (
                        <Link
                          key={task.cycleId}
                          href={`/boards/${task.boardId}`}
                          className="block rounded-md border border-border-subtle bg-background px-2 py-2 hover:bg-surface-hover transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-body font-medium text-text-primary">{task.cardTitle}</div>
                              <div className="text-caption text-text-tertiary">
                                {task.boardName} - {formatDisplayDate(task.finalizedAt)}
                              </div>
                            </div>
                            <div className={cn('text-body font-medium', qualityTierClass(task.qualityTier))}>
                              {task.overallAverage !== null ? task.overallAverage.toFixed(2) : 'N/A'}
                            </div>
                          </div>
                        </Link>
                      ))}
                      {qualitySummary.latestFinalizedTasks.length === 0 && (
                        <div className="text-caption text-text-tertiary">No finalized quality scores yet.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-body text-text-tertiary">
                  Quality summary unavailable.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading || !data) return <UserDetailSkeleton />;

  const { user, allTeams, allSkills, allCompanyRoles } = data;

  const activeBoards = user.boardMembers.filter(
    (m) => !m.board.archivedAt && !m.board.isTemplate
  );

  // Convert user to edit format
  const userToEdit = {
    id: user.id,
    name: user.name,
    email: user.email,
    permission: user.permission,
    teamMembers: user.teamMembers.map(tm => ({
      team: {
        id: tm.team.id,
        name: tm.team.name,
        color: tm.team.color,
      },
    })),
    userSkills: user.userSkills.map(us => ({
      skill: {
        id: us.skill.id,
        name: us.skill.name,
        color: us.skill.color,
      },
    })),
    userCompanyRoles: (user.userCompanyRoles || []).map(ucr => ({
      companyRole: {
        id: ucr.companyRole.id,
        name: ucr.companyRole.name,
        color: ucr.companyRole.color,
      },
    })),
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Profile Header */}
      <div className="border-b border-border bg-surface px-6 py-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 rounded-full bg-surface-hover overflow-hidden">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || user.email}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-medium text-text-secondary">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-heading font-semibold">{user.name || 'Unnamed User'}</h1>
              <div className="flex items-center gap-2 mt-1 text-body text-text-secondary">
                <Mail className="h-4 w-4" />
                {user.email}
              </div>
              <div className="flex items-center gap-4 mt-2 text-caption text-text-tertiary">
                <span className="capitalize px-2 py-0.5 rounded bg-surface-hover">
                  {user.permission.toLowerCase().replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {formatDisplayDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/users/${user.id}/time`}>
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-1" />
                Time Stats
              </Button>
            </Link>
            {isSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit User
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 flex items-center gap-6 text-body">
          <div>
            <span className="font-semibold text-text-primary">{user.teamMembers.length}</span>
            <span className="text-text-secondary ml-1">teams</span>
          </div>
          <div>
            <span className="font-semibold text-text-primary">{activeBoards.length}</span>
            <span className="text-text-secondary ml-1">boards</span>
          </div>
          <div>
            <span className="font-semibold text-text-primary">{user._count.assignedCards}</span>
            <span className="text-text-secondary ml-1">assigned tasks</span>
          </div>
          <div>
            <span className="font-semibold text-text-primary">{user._count.comments}</span>
            <span className="text-text-secondary ml-1">comments</span>
          </div>
        </div>
      </div>

      {renderQualitySummary()}

      <main className="p-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Roles & Skills Section */}
          <div className="lg:col-span-1">
            {canManageSlackLink && (
              <div className="mb-6 rounded-lg border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-title font-medium text-text-secondary">
                    Slack Profile Link
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadSlackUsers()}
                    disabled={isLoadingSlackUsers}
                  >
                    {isLoadingSlackUsers ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>

                <p className="text-caption text-text-tertiary">
                  Admin-only. Linking sets this user&apos;s avatar from Slack.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="slack-user-search">Search Slack users</Label>
                  <Input
                    id="slack-user-search"
                    placeholder="Name or email..."
                    value={slackSearch}
                    onChange={(e) => setSlackSearch(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slack-user-select">Slack profile</Label>
                  <select
                    id="slack-user-select"
                    value={selectedSlackUserId}
                    onChange={(e) => setSelectedSlackUserId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    disabled={isLoadingSlackUsers}
                  >
                    <option value="">Unlinked</option>
                    {filteredSlackUsers.map((slackUser) => {
                      const label = slackUser.displayName || slackUser.realName || slackUser.id;
                      const emailPart = slackUser.email ? ` (${slackUser.email})` : '';
                      return (
                        <option key={slackUser.id} value={slackUser.id}>
                          {label}
                          {emailPart}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-caption text-text-tertiary">
                    Showing {filteredSlackUsers.length} of {slackUsers.length} users.
                  </p>
                </div>

                {selectedSlackUser ? (
                  <div className="text-caption text-text-secondary">
                    Selected: {selectedSlackUser.displayName || selectedSlackUser.realName || selectedSlackUser.id}
                  </div>
                ) : null}

                {slackError ? (
                  <div className="text-caption text-error">{slackError}</div>
                ) : null}

                <Button
                  type="button"
                  onClick={() => void handleSaveSlackLink()}
                  disabled={!hasSlackSelectionChanges || isSavingSlackLink}
                >
                  {isSavingSlackLink ? 'Saving...' : 'Save Slack Link'}
                </Button>
              </div>
            )}

            {/* Company Roles */}
            {(user.userCompanyRoles || []).length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-text-secondary" />
                  <h2 className="text-title font-medium text-text-secondary">
                    Roles ({(user.userCompanyRoles || []).length})
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(user.userCompanyRoles || []).map(({ companyRole }) => (
                    <div
                      key={companyRole.id}
                      className="px-3 py-1.5 rounded-full text-body font-medium"
                      style={{
                        backgroundColor: `${companyRole.color || '#71717a'}20`,
                        color: companyRole.color || '#71717a',
                      }}
                    >
                      {companyRole.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-text-secondary" />
              <h2 className="text-title font-medium text-text-secondary">
                Skills ({user.userSkills.length})
              </h2>
            </div>
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              {user.userSkills.length === 0 ? (
                <div className="p-4 text-center text-text-tertiary">No skills assigned</div>
              ) : (
                <div className="divide-y divide-border">
                  {user.userSkills.map(({ skill }) => (
                    <div
                      key={skill.id}
                      className="flex items-center gap-3 p-3"
                    >
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: skill.color || '#71717a' }}
                      >
                        <span className="text-body font-medium text-white">
                          {skill.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">{skill.name}</div>
                        {skill.description && (
                          <div className="text-caption text-text-tertiary truncate max-w-[200px]">
                            {skill.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Boards */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-4 w-4 text-text-secondary" />
                <h2 className="text-title font-medium text-text-secondary">
                  Active Boards ({activeBoards.length})
                </h2>
              </div>
              <div className="rounded-lg border border-border bg-surface overflow-hidden">
                {activeBoards.length === 0 ? (
                  <div className="p-4 text-center text-text-tertiary">No active boards</div>
                ) : (
                  <div className="divide-y divide-border">
                    {activeBoards.slice(0, 5).map(({ board, permission }) => (
                      <Link
                        key={board.id}
                        href={`/boards/${board.id}`}
                        className="flex items-center justify-between p-3 hover:bg-surface-hover transition-colors"
                      >
                        <span className="font-medium text-text-primary hover:text-card-epic">
                          {board.name}
                        </span>
                        <span className="text-caption text-text-tertiary capitalize">
                          {permission.toLowerCase()}
                        </span>
                      </Link>
                    ))}
                    {activeBoards.length > 5 && (
                      <div className="p-3 text-center text-caption text-text-tertiary">
                        +{activeBoards.length - 5} more boards
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Teams Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-text-secondary" />
              <h2 className="text-title font-medium text-text-secondary">
                Teams ({user.teamMembers.length})
              </h2>
            </div>
            {user.teamMembers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <Users className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
                <h3 className="text-title text-text-secondary">Not in any teams</h3>
                <p className="mt-2 text-body text-text-tertiary">
                  This user hasn&apos;t been added to any teams yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {user.teamMembers.map(({ team, title }) => (
                  <div key={team.id} className="relative">
                    <TeamCard
                      id={team.id}
                      name={team.name}
                      description={team.description}
                      image={team.image}
                      color={team.color}
                      memberCount={team._count.members}
                      boardCount={team._count.boards}
                      members={team.members}
                    />
                    {title && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-tiny font-medium bg-surface/90 text-text-secondary">
                        {title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit User Dialog */}
      <EditUserDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        user={userToEdit}
        teams={allTeams}
        skills={allSkills}
        companyRoles={allCompanyRoles}
      />
    </div>
  );
}

