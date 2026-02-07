'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { useProjects } from '@/hooks/api/use-projects';
import type { BoardSettings } from '@/types';

interface ProjectsPageClientProps {
  isAdmin: boolean;
}

function ProjectsSkeleton() {
  return (
    <main className="p-6 flex-1">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-36 animate-pulse rounded bg-surface-hover" />
        <div className="h-8 w-32 animate-pulse rounded bg-surface-hover" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-md bg-surface-hover" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export function ProjectsPageClient({ isAdmin }: ProjectsPageClientProps) {
  const { data: boards, isLoading } = useProjects();

  if (isLoading) return <ProjectsSkeleton />;

  const projectBoards = boards || [];

  return (
    <main className="p-6 flex-1">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-title font-medium text-text-secondary">
          Projects ({projectBoards.length})
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

      {projectBoards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h3 className="text-title text-text-secondary">No projects yet</h3>
          <p className="mt-2 text-body text-text-tertiary">
            Create your first project from the Timeline to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projectBoards.map((board) => (
            <ProjectCard
              key={board.id}
              id={board.id}
              name={board.name}
              teamName={board.team?.name || null}
              teamColor={board.team?.color || null}
              members={board.members}
              settings={(board.settings as BoardSettings) || null}
            />
          ))}
        </div>
      )}
    </main>
  );
}
