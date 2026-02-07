import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

interface StudioListItem {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  color: string | null;
  teams: { id: string }[];
  _count: {
    teams: number;
  };
}

interface StudioDetailTeamMember {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface StudioDetailTeam {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  color: string;
  members: StudioDetailTeamMember[];
  _count: {
    boards: number;
    members: number;
  };
}

interface StudioDetail {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  color: string | null;
  archivedAt: string | null;
  teams: StudioDetailTeam[];
  _count: {
    teams: number;
  };
}

export function useStudios() {
  return useQuery({
    queryKey: ['studios'],
    queryFn: () => apiFetch<StudioListItem[]>('/api/studios'),
  });
}

export function useStudio(studioId: string) {
  return useQuery({
    queryKey: ['studios', studioId],
    queryFn: () => apiFetch<StudioDetail>(`/api/studios/${studioId}`),
    enabled: !!studioId,
  });
}
