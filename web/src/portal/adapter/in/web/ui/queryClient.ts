import { QueryClient, notifyManager } from '@tanstack/react-query';
import { queryKeys } from './queryKeys.ts';

// UI-DESIGN D7. TanStack only caches the reads: nothing is ever refetched by itself (the legacy page loads once and
// refreshes where its code said so), a failed read is not retried, and a read bound to one screen is dropped when that
// screen unmounts so the screen shows its loading text again on the next mount, like the legacy render().
export function createQueryClient(): QueryClient {
  // Observers are told through the microtask queue, not setTimeout(0): the screen then follows an answer even while page timers
  // are frozen (the behavior recorder pauses the page clock), and a legacy fetch().then() redraw never waited for a timer either.
  notifyManager.setScheduler((callback) => queueMicrotask(callback));
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
  // A task is read by `openDetail` (no observer) and then drawn by the detail dialog and held for the edit dialog (the legacy
  // `current` copy). With gcTime 0 the entry would be dropped before the dialog is drawn, which opens it empty until it re-reads.
  client.setQueryDefaults(['task'], { gcTime: Infinity });
  return client;
}
