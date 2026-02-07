import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { TimelineData, BlockType, EventType } from '@/types';

interface TimelineResponse {
  projects: TimelineData[];
  teams: { id: string; name: string; color: string }[];
  users: { id: string; name: string | null; email: string; image: string | null }[];
  blockTypes: BlockType[];
  eventTypes: EventType[];
}

export function useTimelineData() {
  return useQuery({
    queryKey: ['timeline'],
    queryFn: () => apiFetch<TimelineResponse>('/api/timeline'),
  });
}
