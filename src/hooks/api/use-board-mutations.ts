import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Card, CardType, CardAssignee, List, ListViewType } from '@/types';

interface ReorderParams {
  cardId: string;
  sourceListId: string;
  destinationListId: string;
  newPosition: number;
}

interface CreateListParams {
  name: string;
  viewType?: ListViewType;
}

interface CreateCardParams {
  title: string;
  type: CardType;
  listId: string;
  taskData?: Record<string, unknown>;
  userStoryData?: Record<string, unknown>;
  epicData?: Record<string, unknown>;
  utilityData?: Record<string, unknown>;
}

export function useBoardMutations(boardId: string) {
  const queryClient = useQueryClient();

  return useMemo(() => {
    // Force refetch (for when server-computed data changed, e.g. card connections)
    const invalidateBoard = () => {
      queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
    };

    async function reorderCard(params: ReorderParams): Promise<void> {
      await apiFetch(`/api/boards/${boardId}/cards/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
    }

    async function createCard(params: CreateCardParams): Promise<Card> {
      return apiFetch<Card>(`/api/boards/${boardId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
    }

    async function deleteCard(cardId: string): Promise<void> {
      await apiFetch(`/api/boards/${boardId}/cards/${cardId}`, {
        method: 'DELETE',
      });
    }

    async function assignUser(cardId: string, userId: string): Promise<CardAssignee> {
      return apiFetch<CardAssignee>(
        `/api/boards/${boardId}/cards/${cardId}/assignees`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }
      );
    }

    async function unassignUser(cardId: string, userId: string): Promise<void> {
      await apiFetch(
        `/api/boards/${boardId}/cards/${cardId}/assignees?userId=${userId}`,
        { method: 'DELETE' }
      );
    }

    async function createList(params: CreateListParams): Promise<List> {
      return apiFetch<List>(`/api/boards/${boardId}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
    }

    return {
      invalidateBoard,
      reorderCard,
      createCard,
      deleteCard,
      assignUser,
      unassignUser,
      createList,
    };
  }, [boardId, queryClient]);
}
