'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, Settings, Gauge, ChevronDown, ChevronRight } from 'lucide-react';
import { useStudio } from '@/hooks/api/use-studios';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { TeamCard } from '@/components/organization/TeamCard';
import { CreateTeamDialog } from '@/components/organization/CreateTeamDialog';
import { StudioSettingsModal } from '@/components/organization/StudioSettingsModal';
import { StudioDetailSkeleton } from '@/components/organization/StudioDetailSkeleton';

interface StudioDetailClientProps {
  studioId: string;
  isAdmin: boolean;
  canViewQualitySummaries: boolean;
}

interface StudioQualitySummary {
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
    teamId: string | null;
    teamName: string | null;
    doneTaskCount: number;
    finalizedTaskCount: number;
    coveragePct: number | null;
    overallAverage: number | null;
    overallQualityTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';
  }>;
}

export function StudioDetailClient({
  studioId,
  isAdmin,
  canViewQualitySummaries,
}: StudioDetailClientProps) {
  const { data: studio, isLoading } = useStudio(studioId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qualitySummaryExpanded, setQualitySummaryExpanded] = useState(false);
  const {
    data: qualitySummary,
    isLoading: isLoadingQualitySummary,
  } = useQuery({
    queryKey: ['metrics', 'studios', studioId, 'quality-summary'],
    queryFn: () => apiFetch<StudioQualitySummary>(`/api/metrics/studios/${studioId}/quality-summary`),
    enabled: Boolean(studioId) && canViewQualitySummaries,
    retry: false,
  });

  if (isLoading || !studio) return <StudioDetailSkeleton />;

  // Calculate total unique members across all teams
  const uniqueMembers = new Set<string>();
  studio.teams.forEach((team) => {
    team.members.forEach((member) => {
      uniqueMembers.add(member.user.id);
    });
  });
  const totalMembers = uniqueMembers.size;

  const qualityTierClass = (tier: StudioQualitySummary['totals']['overallQualityTier']) => {
    if (tier === 'HIGH') return 'text-green-600';
    if (tier === 'MEDIUM') return 'text-amber-600';
    if (tier === 'LOW') return 'text-red-600';
    return 'text-text-tertiary';
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
                                {project.teamName || 'No team'} | coverage {project.coveragePct !== null ? `${project.coveragePct.toFixed(1)}%` : 'N/A'} | {project.finalizedTaskCount}/{project.doneTaskCount}
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
      {/* Header Banner */}
      <div
        className="h-32 bg-gradient-to-br from-card-epic/20 to-card-epic/5"
        style={{
          backgroundImage: studio.image ? `url(${studio.image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: !studio.image && studio.color ? studio.color : undefined,
        }}
      />

      <div className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 -mt-12 shrink-0 items-center justify-center rounded-xl border-4 border-surface bg-card-epic/10 text-card-epic"
              style={{
                backgroundColor: studio.color ? `${studio.color}20` : undefined,
                color: studio.color || undefined,
              }}
            >
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href="/studios"
                  className="text-caption text-text-tertiary hover:text-text-secondary"
                >
                  Studios
                </Link>
                <span className="text-text-tertiary">/</span>
              </div>
              <h1 className="text-heading font-semibold">{studio.name}</h1>
              {studio.description && (
                <p className="mt-1 text-body text-text-secondary max-w-2xl">
                  {studio.description}
                </p>
              )}
            </div>
          </div>
          {isAdmin && (
            <button
              className="p-2 rounded-md hover:bg-surface-hover text-text-secondary hover:text-text-primary"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-6 text-body">
          <div>
            <span className="font-semibold text-text-primary">{studio._count.teams}</span>
            <span className="text-text-secondary ml-1">teams</span>
          </div>
          <div>
            <span className="font-semibold text-text-primary">{totalMembers}</span>
            <span className="text-text-secondary ml-1">members</span>
          </div>
        </div>
      </div>

      {renderQualitySummary()}

      <main className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-title font-medium text-text-secondary">
            Teams ({studio.teams.length})
          </h2>
          {isAdmin && <CreateTeamDialog studioId={studio.id} />}
        </div>

        {studio.teams.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <h3 className="text-title text-text-secondary">No teams yet</h3>
            <p className="mt-2 text-body text-text-tertiary">
              {isAdmin
                ? 'Create your first team in this studio.'
                : 'No teams have been added to this studio yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {studio.teams.map((team) => (
              <TeamCard
                key={team.id}
                id={team.id}
                name={team.name}
                description={team.description}
                image={team.image}
                color={team.color}
                memberCount={team._count.members}
                boardCount={team._count.boards}
                members={team.members}
              />
            ))}
          </div>
        )}
      </main>

      {isAdmin && (
        <StudioSettingsModal
          studio={{
            id: studio.id,
            name: studio.name,
            image: studio.image,
          }}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}
    </div>
  );
}
