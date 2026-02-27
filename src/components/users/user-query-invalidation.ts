import type { QueryClient } from '@tanstack/react-query';

interface InvalidateUserAndTeamQueriesOptions {
  teamIds?: Iterable<string>;
  userId?: string;
}

export function invalidateUserAndTeamQueries(
  queryClient: QueryClient,
  options: InvalidateUserAndTeamQueriesOptions = {}
) {
  const { teamIds = [], userId } = options;

  queryClient.invalidateQueries({ queryKey: ['users', 'page'] });
  queryClient.invalidateQueries({ queryKey: ['users'] });
  if (userId) {
    queryClient.invalidateQueries({ queryKey: ['users', userId, 'detail'] });
  }
  queryClient.invalidateQueries({ queryKey: ['teams'] });

  for (const teamId of new Set(teamIds)) {
    queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
  }
}
