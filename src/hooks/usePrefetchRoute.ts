import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

/** Maps top-level nav routes to their TanStack Query config for prefetching. */
const ROUTE_PREFETCH_MAP: Record<string, { queryKey: readonly string[]; url: string }> = {
  '/home':         { queryKey: ['home'],            url: '/api/me/home' },
  '/boards':       { queryKey: ['boards'],          url: '/api/boards' },
  '/projects':     { queryKey: ['projects'],        url: '/api/boards?projects=true' },
  '/timeline':     { queryKey: ['timeline'],        url: '/api/timeline' },
  '/teams':        { queryKey: ['teams'],           url: '/api/teams' },
  '/studios':      { queryKey: ['studios'],         url: '/api/studios' },
  '/users':        { queryKey: ['users', 'page'],   url: '/api/users?include=metadata' },
  '/organization': { queryKey: ['organization'],    url: '/api/organization' },
};

/**
 * Returns a `prefetch` callback that pre-populates TanStack Query cache
 * for a given nav route. Intended for onMouseEnter / onFocus on nav links.
 *
 * Skips prefetch if data is already cached.
 */
export function usePrefetchRoute() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    (route: string) => {
      const config = ROUTE_PREFETCH_MAP[route];
      if (!config) return;

      // Skip if already in cache
      if (queryClient.getQueryData(config.queryKey)) return;

      void queryClient.prefetchQuery({
        queryKey: config.queryKey,
        queryFn: () => apiFetch(config.url),
        staleTime: 5 * 60 * 1000, // match global default
      });
    },
    [queryClient],
  );

  return { prefetch };
}
