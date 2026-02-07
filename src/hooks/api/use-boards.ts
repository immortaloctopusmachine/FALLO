import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// Matches the shape returned by GET /api/boards
interface BoardListItem {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
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
  lists: {
    id: string;
    _count: { cards: number };
  }[];
}

// Matches shape for archived boards display
interface ArchivedBoardItem {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
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
  lists: {
    id: string;
    _count: { cards: number };
  }[];
}

export function useBoards() {
  return useQuery({
    queryKey: ['boards'],
    queryFn: () => apiFetch<BoardListItem[]>('/api/boards'),
  });
}

export function useArchivedBoards() {
  return useQuery({
    queryKey: ['boards', 'archived'],
    queryFn: () => apiFetch<ArchivedBoardItem[]>('/api/boards?archived=true'),
  });
}

// The board detail response includes enhanced lists with computed card stats
export function useBoard(boardId: string) {
  return useQuery({
    queryKey: ['boards', boardId],
    queryFn: () => apiFetch<Record<string, unknown>>(`/api/boards/${boardId}`),
    enabled: !!boardId,
  });
}
