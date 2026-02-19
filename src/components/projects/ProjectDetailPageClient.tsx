'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { ProjectDetailClient } from '@/components/projects/ProjectDetailClient';
import type { BoardSettings } from '@/types';

interface ProjectDetailPageClientProps {
  projectId: string;
  currentUserId: string;
  userPermission: string;
  canViewQualitySummaries: boolean;
}

function ProjectDetailSkeleton() {
  return (
    <main className="flex-1">
      {/* Banner skeleton */}
      <div className="h-[140px] w-full animate-pulse bg-surface-hover" />

      {/* Stats bar skeleton */}
      <div className="border-b border-border bg-surface px-6 py-3">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 max-w-6xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-hover" />
          ))}
        </div>
      </div>

      {/* Team + members bar skeleton */}
      <div className="border-b border-border bg-surface px-6 py-2.5">
        <div className="flex items-center justify-between max-w-6xl">
          <div className="h-8 w-48 animate-pulse rounded bg-surface-hover" />
          <div className="flex -space-x-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-7 w-7 animate-pulse rounded-full bg-surface-hover border-2 border-surface" />
            ))}
          </div>
        </div>
      </div>

      {/* Three-column skeleton */}
      <div className="max-w-6xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <div className="h-5 w-24 animate-pulse rounded bg-surface-hover" />
            <div className="rounded-lg border border-border p-4 space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-surface-hover" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-5 w-24 animate-pulse rounded bg-surface-hover" />
            <div className="h-20 animate-pulse rounded-lg bg-surface-hover" />
            <div className="h-5 w-32 animate-pulse rounded bg-surface-hover" />
            <div className="rounded-lg border border-border p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-surface-hover" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-5 w-16 animate-pulse rounded bg-surface-hover" />
            <div className="rounded-lg border border-border p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-surface-hover" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
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
  lists: {
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
  }[];
  weeklyProgress: {
    id: string;
    completedPoints: number;
  }[];
  timelineEvents: {
    id: string;
    title: string;
    description: string | null;
    startDate: string;
    endDate: string;
    eventType: {
      id: string;
      name: string;
      color: string;
      icon: string | null;
      description: string | null;
      isDefault: boolean;
      position: number;
    };
  }[];
  timelineBlocks: {
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
  }[];
}

interface CompanyRoleOption {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

interface EventTypeOption {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
  isDefault: boolean;
  position: number;
}

export function ProjectDetailPageClient({
  projectId,
  currentUserId,
  userPermission,
  canViewQualitySummaries,
}: ProjectDetailPageClientProps) {
  const { data: project, isLoading: isLoading } = useQuery({
    queryKey: ['boards', projectId, 'project'],
    queryFn: () => apiFetch<ProjectData>(`/api/boards/${projectId}?scope=project`),
  });

  // Derive isAdmin from project membership OR global SUPER_ADMIN permission
  const membership = project?.members.find(m => m.userId === currentUserId);
  const isAdmin = userPermission === 'SUPER_ADMIN'
    || membership?.permission === 'ADMIN'
    || membership?.permission === 'SUPER_ADMIN';

  // Only fetch teams if admin (for team selector)
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiFetch<{ id: string; name: string; color: string }[]>('/api/teams'),
    enabled: isAdmin,
  });

  const { data: companyRoles } = useQuery({
    queryKey: ['settings', 'roles'],
    queryFn: () => apiFetch<CompanyRoleOption[]>('/api/settings/roles'),
  });

  const { data: eventTypes } = useQuery({
    queryKey: ['settings', 'event-types'],
    queryFn: () => apiFetch<EventTypeOption[]>('/api/settings/event-types'),
  });

  if (isLoading || !project) return <ProjectDetailSkeleton />;

  return (
    <ProjectDetailClient
      board={{
        id: project.id,
        name: project.name,
        description: project.description,
        teamId: project.teamId,
        team: project.team,
        settings: (project.settings as BoardSettings) || {},
        members: project.members.map(m => ({
          id: m.id,
          permission: m.permission,
          user: {
            ...m.user,
            userCompanyRoles: m.user.userCompanyRoles || [],
          },
        })),
        lists: project.lists,
        weeklyProgress: project.weeklyProgress,
        timelineEvents: project.timelineEvents,
        timelineBlocks: project.timelineBlocks,
      }}
      teams={teams || []}
      companyRoles={companyRoles || []}
      eventTypes={eventTypes || []}
      isAdmin={isAdmin}
      isSuperAdmin={userPermission === 'SUPER_ADMIN'}
      canViewQualitySummaries={canViewQualitySummaries}
    />
  );
}
