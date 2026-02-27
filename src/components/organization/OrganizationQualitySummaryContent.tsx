'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getQualityTierTextClass, type QualityTier } from '@/lib/quality-tier';

interface OrganizationQualitySummaryTotals {
  projectCount: number;
  doneTaskCount: number;
  finalizedTaskCount: number;
  overallAverage: number | null;
  overallQualityTier: QualityTier;
}

interface OrganizationQualitySummaryProject {
  projectId: string;
  projectName: string;
  teamName?: string | null;
  doneTaskCount: number;
  finalizedTaskCount: number;
  coveragePct: number | null;
  overallAverage: number | null;
  overallQualityTier: QualityTier;
}

interface OrganizationQualitySummaryContentProps {
  totals: OrganizationQualitySummaryTotals;
  projects: OrganizationQualitySummaryProject[];
  showTeamName?: boolean;
}

export function OrganizationQualitySummaryContent({
  totals,
  projects,
  showTeamName = false,
}: OrganizationQualitySummaryContentProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-md border border-border-subtle bg-background p-3">
          <div className="text-caption text-text-tertiary">Overall</div>
          <div className={cn('text-title font-semibold mt-1', getQualityTierTextClass(totals.overallQualityTier))}>
            {totals.overallAverage !== null ? totals.overallAverage.toFixed(2) : 'Unscored'}
          </div>
          <div className="text-caption text-text-tertiary">{totals.overallQualityTier}</div>
        </div>
        <div className="rounded-md border border-border-subtle bg-background p-3">
          <div className="text-caption text-text-tertiary">Projects</div>
          <div className="text-title font-semibold mt-1 text-text-primary">{totals.projectCount}</div>
        </div>
        <div className="rounded-md border border-border-subtle bg-background p-3">
          <div className="text-caption text-text-tertiary">Done Tasks</div>
          <div className="text-title font-semibold mt-1 text-text-primary">{totals.doneTaskCount}</div>
        </div>
        <div className="rounded-md border border-border-subtle bg-background p-3">
          <div className="text-caption text-text-tertiary">Finalized</div>
          <div className="text-title font-semibold mt-1 text-text-primary">{totals.finalizedTaskCount}</div>
        </div>
      </div>

      <div className="rounded-md border border-border-subtle bg-background overflow-hidden">
        {projects.length === 0 ? (
          <div className="p-3 text-caption text-text-tertiary">No project data yet.</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {projects.map((project) => (
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
                    {showTeamName ? `${project.teamName || 'No team'} | ` : ''}
                    coverage {project.coveragePct !== null ? `${project.coveragePct.toFixed(1)}%` : 'N/A'} | {project.finalizedTaskCount}/{project.doneTaskCount}
                  </div>
                </div>
                <div className={cn('text-body font-medium shrink-0', getQualityTierTextClass(project.overallQualityTier))}>
                  {project.overallAverage !== null ? project.overallAverage.toFixed(2) : 'N/A'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
