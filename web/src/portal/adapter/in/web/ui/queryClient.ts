import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys.ts';

// UI-DESIGN D7. TanStack only caches the reads: nothing is ever refetched by itself (the legacy page loads once and
// refreshes where its code said so), a failed read is not retried, and a read bound to one screen is dropped when that
// screen unmounts so the screen shows its loading text again on the next mount, like the legacy render().
export function createQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: 0,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
      },
      mutations: { retry: false },
    },
  });
  // Session, settings and tasks are the legacy `session`, `config` and `tasks` variables: they live as long as the page.
  for (const key of [queryKeys.session, queryKeys.settings, queryKeys.tasks]) client.setQueryDefaults(key, { gcTime: Infinity });
  return client;
}
