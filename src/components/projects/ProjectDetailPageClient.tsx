'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { ProjectDetailClient } from '@/components/projects/ProjectDetailClient';
import type { BoardSettings } from '@/types';

interface ProjectDetailPageClientProps {
  projectId: string;
  currentUserId: string;
}

function ProjectDetailSkeleton() {
  return (
    <main className="p-6 flex-1">
      {/* Back button */}
      <div className="h-5 w-24 animate-pulse rounded bg-surface-hover mb-6" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-32 animate-pulse rounded bg-surface-hover" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded bg-surface-hover" />
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="h-5 w-24 animate-pulse rounded bg-surface-hover" />
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-surface-hover" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-5 w-24 animate-pulse rounded bg-surface-hover" />
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-surface-hover" />
                <div className="h-4 w-28 animate-pulse rounded bg-surface-hover" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

interface ProjectBoardData {
  id: string;
  name: string;
  teamId: string | null;
  settings: unknown;
  team: { id: string; name: string; color: string } | null;
  members: {
    id: string;
    userId: string;
    permission: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      userCompanyRoles?: {
        companyRole: {
          id: string;
          name: string;
          color: string | null;
          position: number;
        };
      }[];
    };
  }[];
}

export function ProjectDetailPageClient({ projectId, currentUserId }: ProjectDetailPageClientProps) {
  const { data: rawBoard, isLoading: boardLoading } = useQuery({
    queryKey: ['boards', projectId, 'project'],
    queryFn: () => apiFetch<ProjectBoardData>(`/api/boards/${projectId}`),
  });

  // Derive isAdmin from membership
  const membership = rawBoard?.members.find(m => m.userId === currentUserId);
  const isAdmin = membership?.permission === 'ADMIN' || membership?.permission === 'SUPER_ADMIN';

  // Only fetch teams if admin (for team selector)
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiFetch<{ id: string; name: string; color: string }[]>('/api/teams'),
    enabled: isAdmin,
  });

  if (boardLoading || !rawBoard) return <ProjectDetailSkeleton />;

  return (
    <ProjectDetailClient
      board={{
        id: rawBoard.id,
        name: rawBoard.name,
        teamId: rawBoard.teamId,
        team: rawBoard.team,
        settings: (rawBoard.settings as BoardSettings) || {},
        members: rawBoard.members.map(m => ({
          id: m.id,
          permission: m.permission,
          user: {
            ...m.user,
            userCompanyRoles: m.user.userCompanyRoles || [],
          },
        })),
      }}
      teams={teams || []}
      isAdmin={isAdmin}
    />
  );
}
