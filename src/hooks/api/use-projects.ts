import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { BoardSettings, WeeklyProgress } from '@/types';

interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  settings: BoardSettings | null;
  team: {
    id: string;
    name: string;
    color: string;
  } | null;
  members: {
    id: string;
    userId: string;
    permission: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }[];
  weeklyProgress: WeeklyProgress[];
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiFetch<ProjectListItem[]>('/api/boards?projects=true'),
  });
}

export function useArchivedProjects() {
  return useQuery({
    queryKey: ['projects', 'archived'],
    queryFn: () => apiFetch<ProjectListItem[]>('/api/boards?projects=true&archived=true'),
  });
}

// Re-export the type for use in client components
export type { ProjectListItem };
