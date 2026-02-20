import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { BoardSettings } from '@/types';

const LIST_STALE_TIME = 5 * 60 * 1000; // 5 minutes for list views

// Matches the shape returned by GET /api/boards
interface BoardListItem {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  settings: BoardSettings;
  members: {
    id: string;
    userId: string;
    permission: string;
    user: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }[];
  lists: {
    id: string;
  }[];
}

// Matches shape for archived boards display
interface ArchivedBoardItem {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  settings: BoardSettings;
  members: {
    id: string;
    userId: string;
    permission: string;
    user: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }[];
  lists: {
    id: string;
  }[];
}

type BoardScope = 'light' | 'full';

export function useBoards() {
  return useQuery({
    queryKey: ['boards'],
    queryFn: () => apiFetch<BoardListItem[]>('/api/boards'),
    staleTime: LIST_STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

export function useArchivedBoards(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['boards', 'archived'],
    queryFn: () => apiFetch<ArchivedBoardItem[]>('/api/boards?archived=true'),
    staleTime: LIST_STALE_TIME,
    enabled: options?.enabled ?? true,
  });
}

// The board detail response includes enhanced lists with computed card stats
export function useBoard(boardId: string, scope: BoardScope = 'light', enabled = true) {
  return useQuery({
    queryKey: ['boards', boardId, scope],
    queryFn: () => apiFetch<Record<string, unknown>>(`/api/boards/${boardId}?scope=${scope}`),
    enabled: !!boardId && enabled,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}
