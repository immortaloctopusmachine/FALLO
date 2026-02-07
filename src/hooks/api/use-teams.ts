import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

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

interface TeamDetailMember {
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

interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  color: string;
  archivedAt: string | null;
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
