'use client';

// Wires the 30 second refresh (autoRefresh.ts) to the page: one timer grid and one input clock for the whole page, like the
// legacy module-level setInterval. The Overview remounts on every render(), so the timer must not belong to one mount.
import { useEffect } from 'react';
import type { TaskSummary } from '../../../../../../request/adapter/in/web/ui/RequestApi.ts';
import { usePortal } from '../PortalContext.tsx';
import { AUTO_REFRESH_MS, SYNC_FAILED_TEXT, createAutoRefresh, nextTickDelay } from './autoRefresh.ts';

type Mounted = { fetchTasks(): Promise<TaskSummary[]>; apply(fresh: TaskSummary[]): void };

// The Overview that is on show right now, null while another screen is.
let mounted: Mounted | null = null;
const EPOCH = Date.now();
let lastActivity = Date.now();
if (typeof document !== 'undefined') {
  for (const event of ['pointerdown', 'keydown']) document.addEventListener(event, () => (lastActivity = Date.now()), { passive: true });
}

const dialogOpen = (): boolean => document.querySelector('dialog[open]') !== null;

const tick = createAutoRefresh<TaskSummary[]>({
  gate: () => ({ onOverview: mounted !== null, hidden: document.hidden, idleMs: Date.now() - lastActivity, dialogOpen: dialogOpen() }),
  fetchTasks: () => (mounted === null ? Promise.reject(new Error('Overview is not shown')) : mounted.fetchTasks()),
  stillCurrent: () => mounted !== null && !dialogOpen(),
  apply: (fresh) => mounted?.apply(fresh),
  fail: () => {
    const status = document.querySelector('#sync-status');
    if (status !== null) status.textContent = SYNC_FAILED_TEXT;
  },
});

/** Refreshes the task list every 30 seconds while this Overview is shown (UI-DESIGN D14). */
export function useDashboardAutoRefresh(): void {
  const { apis, actions } = usePortal();
  useEffect(() => {
    const me: Mounted = { fetchTasks: () => apis.request.listTasks(), apply: actions.applyFreshTasks };
    mounted = me;
    let interval: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      void tick();
      interval = setInterval(() => void tick(), AUTO_REFRESH_MS);
    }, nextTickDelay(EPOCH, Date.now()));
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      if (mounted === me) mounted = null;
    };
  }, [apis, actions]);
}
