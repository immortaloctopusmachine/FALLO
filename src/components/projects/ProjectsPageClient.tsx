'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronDown, ChevronRight, Archive } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { useProjects, useArchivedProjects } from '@/hooks/api/use-projects';
import type { BoardSettings } from '@/types';

interface ProjectsPageClientProps {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  currentUserId: string;
}

function ProjectsSkeleton() {
  return (
    <main className="p-6 flex-1">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-36 animate-pulse rounded bg-surface-hover" />
        <div className="h-8 w-32 animate-pulse rounded bg-surface-hover" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface overflow-hidden"
          >
            {/* Name header skeleton */}
            <div className="px-4 pt-3 pb-2">
              <div className="h-5 w-3/4 animate-pulse rounded bg-surface-hover" />
            </div>
            {/* Team bar skeleton */}
            <div className="h-7 animate-pulse bg-surface-hover" />
            {/* Roles skeleton */}
            <div className="px-4 py-2 space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
            </div>
            {/* Sparkline skeleton */}
            <div className="px-4 pb-2">
              <div className="h-9 animate-pulse rounded bg-surface-hover" />
            </div>
            {/* Dates skeleton */}
            <div className="px-4 pb-3 flex gap-3">
              <div className="h-3 w-24 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-24 animate-pulse rounded bg-surface-hover" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export function ProjectsPageClient({ isAdmin, isSuperAdmin, currentUserId }: ProjectsPageClientProps) {
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useProjects();
  const { data: archivedProjectsData } = useArchivedProjects();
  const [archivedExpanded, setArchivedExpanded] = useState(false);

  if (isLoading) return <ProjectsSkeleton />;

  const activeProjects = projects || [];
  const archivedProjects = archivedProjectsData || [];

  const handleArchivedProjectAction = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['projects', 'archived'] });
  };

  const isProjectAdmin = (project: typeof activeProjects[0]) => {
    if (isSuperAdmin) return true;
    const membership = project.members.find(m => m.userId === currentUserId);
    return membership?.permission === 'ADMIN' || membership?.permission === 'SUPER_ADMIN';
  };

  return (
    <main className="p-6 flex-1">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-title font-medium text-text-secondary">
          Projects ({activeProjects.length})
        </h2>
        {isAdmin && (
          <Link
            href="/timeline?create=true"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-body font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </Link>
        )}
      </div>

      {activeProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h3 className="text-title text-text-secondary">No projects yet</h3>
          <p className="mt-2 text-body text-text-tertiary">
            Create your first project from the Timeline to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {activeProjects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              teamName={project.team?.name || null}
              teamColor={project.team?.color || null}
              members={project.members}
              settings={(project.settings as BoardSettings) || null}
              weeklyProgress={project.weeklyProgress || []}
              isAdmin={isProjectAdmin(project)}
              isSuperAdmin={isSuperAdmin}
            />
          ))}
        </div>
      )}

      {/* Archived Projects Section */}
      {archivedProjects.length > 0 && isAdmin && (
        <div className="mt-10">
          <button
            onClick={() => setArchivedExpanded(!archivedExpanded)}
            className="mb-6 flex items-center gap-2 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {archivedExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Archive className="h-4 w-4" />
            <h2 className="text-title font-medium">
              Archived ({archivedProjects.length})
            </h2>
          </button>

          {archivedExpanded && (
            <>
              <p className="text-caption text-text-tertiary mb-4 ml-6">
                Archived projects are hidden from the main view. Restore them to make them active again.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 opacity-75">
                {archivedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    id={project.id}
                    name={project.name}
                    teamName={project.team?.name || null}
                    teamColor={project.team?.color || null}
                    members={project.members}
                    settings={(project.settings as BoardSettings) || null}
                    weeklyProgress={project.weeklyProgress || []}
                    isAdmin={isProjectAdmin(project)}
                    isSuperAdmin={isSuperAdmin}
                    isArchived
                    onDeleted={handleArchivedProjectAction}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
