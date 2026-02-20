import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Comment, Attachment } from '@/types';

interface AttachmentWithComments extends Attachment {
  comments: Comment[];
}

interface CardDetailsResponse {
  comments: Comment[];
  attachments: AttachmentWithComments[];
}

const CARD_DETAILS_STALE_TIME = 60_000; // 1 minute

/**
 * Prefetch card details (comments + attachments) on hover.
 * Also preloads the card's feature image into the browser cache.
 */
export function useCardDetailPrefetch(boardId: string) {
  const queryClient = useQueryClient();

  const prefetchCardDetails = useCallback(
    (cardId: string, featureImage?: string | null) => {
      // Skip if already cached and fresh
      if (queryClient.getQueryData(['card-details', boardId, cardId])) return;

      void queryClient.prefetchQuery({
        queryKey: ['card-details', boardId, cardId],
        queryFn: () =>
          apiFetch<CardDetailsResponse>(
            `/api/boards/${boardId}/cards/${cardId}/details`
          ),
        staleTime: CARD_DETAILS_STALE_TIME,
      });

      // Pre-warm browser image cache for feature image
      if (featureImage) {
        const img = new Image();
        img.src = featureImage;
      }
    },
    [boardId, queryClient]
  );

  return { prefetchCardDetails };
}

/**
 * Consume prefetched card details. Used in views to read the cache
 * and pass data down to CardModal → CommentsSection / AttachmentSection.
 */
export function useCardDetails(boardId: string, cardId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ['card-details', boardId, cardId],
    queryFn: () =>
      apiFetch<CardDetailsResponse>(
        `/api/boards/${boardId}/cards/${cardId}/details`
      ),
    enabled: !!boardId && !!cardId,
    staleTime: CARD_DETAILS_STALE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    comments: data?.comments,
    attachments: data?.attachments,
    isLoading,
  };
}
