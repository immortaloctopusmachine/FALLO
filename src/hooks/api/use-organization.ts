import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

interface OrgStudio {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  color: string | null;
  teams: { id: string }[];
  _count: { teams: number };
}

interface OrgTeam {
  id: string;
  name: string;
  color: string;
  studio: { id: string; name: string } | null;
  _count: { members: number; boards: number };
}

interface OrgUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  permission: string;
  _count: { teamMembers: number };
}

export interface OrganizationData {
  studios: OrgStudio[];
  teams: OrgTeam[];
  users: OrgUser[];
}

export function useOrganizationData() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: () => apiFetch<OrganizationData>('/api/organization'),
  });
}
