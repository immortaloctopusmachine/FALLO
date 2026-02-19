import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type {
  TimelineData,
  TimelineArchivedProjectSummary,
  BlockType,
  EventType,
} from '@/types';

interface TimelineResponse {
  projects: TimelineData[];
  archivedProjects: TimelineArchivedProjectSummary[];
  teams: { id: string; name: string; color: string }[];
  users: { id: string; name: string | null; email: string; image: string | null }[];
  blockTypes: BlockType[];
  eventTypes: EventType[];
}

export function useTimelineData() {
  return useQuery({
    queryKey: ['timeline'],
    queryFn: () => apiFetch<TimelineResponse>('/api/timeline'),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  });
}
