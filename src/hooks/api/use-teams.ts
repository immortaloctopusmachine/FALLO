import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { TeamSettings } from '@/types';

interface TeamMember {
  id: string;
  userId: string;
  permission: string;
  title: string | null;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface TeamListItem {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  color: string;
  studio: { id: string; name: string; color: string | null } | null;
  members: TeamMember[];
  _count: {
    boards: number;
    members: number;
  };
}

export interface TeamDetailMember {
  id: string;
  userId: string;
  permission: string;
  title: string | null;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    permission: string;
    userSkills: {
      skill: {
        id: string;
        name: string;
        color: string | null;
      };
    }[];
    userCompanyRoles?: {
      companyRole: {
        id: string;
        name: string;
        color: string | null;
        position: number;
      };
    }[];
  };
}

interface TeamDetailBoard {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  members: { id: string; userId: string; permission: string }[];
  lists: { id: string }[];
  _count: { lists: number; members: number };
}

export interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  color: string;
  archivedAt: string | null;
  settings: TeamSettings;
  studio: { id: string; name: string; color: string | null } | null;
  members: TeamDetailMember[];
  boards: TeamDetailBoard[];
  _count: {
    boards: number;
    members: number;
  };
}

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => apiFetch<TeamListItem[]>('/api/teams'),
  });
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: ['teams', teamId],
    queryFn: () => apiFetch<TeamDetail>(`/api/teams/${teamId}`),
    enabled: !!teamId,
  });
}
