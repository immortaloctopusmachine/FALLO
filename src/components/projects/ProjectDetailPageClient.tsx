'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { ProjectDetailClient } from '@/components/projects/ProjectDetailClient';
import { ProjectDetailSkeleton } from '@/components/projects/ProjectDetailSkeleton';
import type { BoardSettings } from '@/types';

interface ProjectDetailPageClientProps {
  projectId: string;
  currentUserId: string;
  userPermission: string;
  canViewQualitySummaries: boolean;
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
