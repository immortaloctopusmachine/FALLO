import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

interface UsersPageUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  permission: string;
  createdAt: string;
  teamMembers: {
    team: { id: string; name: string; color: string };
  }[];
  userSkills: {
    skill: { id: string; name: string; color: string | null };
  }[];
  userCompanyRoles: {
    companyRole: { id: string; name: string; color: string | null };
  }[];
  _count: { assignedCards: number; boardMembers: number };
}

interface TeamItem {
  id: string;
  name: string;
  color: string;
}

interface MetadataItem {
  id: string;
  name: string;
  color: string | null;
}

export interface UsersPageData {
  users: UsersPageUser[];
  teams: TeamItem[];
  skills: MetadataItem[];
  companyRoles: MetadataItem[];
}

interface UserDetailData {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  permission: string;
  createdAt: string;
  teamMembers: {
    team: {
      id: string;
      name: string;
      color: string;
      description: string | null;
      image: string | null;
      studio: { id: string; name: string } | null;
      members: {
        user: { id: string; name: string | null; email: string; image: string | null };
      }[];
      _count: { boards: number; members: number };
    };
    title: string | null;
    permission: string;
  }[];
  userSkills: {
    skill: { id: string; name: string; color: string | null; description: string | null };
  }[];
  userCompanyRoles: {
    companyRole: { id: string; name: string; color: string | null; description: string | null };
  }[];
  boardMembers: {
    board: { id: string; name: string; archivedAt: string | null; isTemplate: boolean };
    permission: string;
  }[];
  _count: { assignedCards: number; comments: number; activities: number };
}

export interface UserDetailPageData {
  user: UserDetailData;
  allTeams: TeamItem[];
  allSkills: MetadataItem[];
  allCompanyRoles: MetadataItem[];
}

export function useUsersPageData() {
  return useQuery({
    queryKey: ['users', 'page'],
    queryFn: () => apiFetch<UsersPageData>('/api/users?include=metadata'),
  });
}

export function useUserDetail(userId: string) {
  return useQuery({
    queryKey: ['users', userId, 'detail'],
    queryFn: () => apiFetch<UserDetailPageData>(`/api/users/${userId}?include=metadata`),
    enabled: !!userId,
  });
}
