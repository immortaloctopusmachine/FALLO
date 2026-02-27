'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, Settings } from 'lucide-react';
import { useStudio } from '@/hooks/api/use-studios';
import { apiFetch } from '@/lib/api-client';
import { TeamCard } from '@/components/organization/TeamCard';
import { CreateTeamDialog } from '@/components/organization/CreateTeamDialog';
import { OrganizationQualitySummaryContent } from '@/components/organization/OrganizationQualitySummaryContent';
import { StudioSettingsModal } from '@/components/organization/StudioSettingsModal';
import { StudioDetailSkeleton } from '@/components/organization/StudioDetailSkeleton';
import { QualitySummarySection } from '@/components/quality/QualitySummarySection';

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

  const renderQualitySummary = () => {
    if (!canViewQualitySummaries) {
      return null;
    }

    return (
      <QualitySummarySection
        expanded={qualitySummaryExpanded}
        onToggle={() => setQualitySummaryExpanded(!qualitySummaryExpanded)}
        isLoading={isLoadingQualitySummary}
        hasData={Boolean(qualitySummary)}
      >
        {qualitySummary ? (
          <OrganizationQualitySummaryContent
            totals={qualitySummary.totals}
            projects={qualitySummary.projects}
            showTeamName
          />
        ) : null}
      </QualitySummarySection>
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
