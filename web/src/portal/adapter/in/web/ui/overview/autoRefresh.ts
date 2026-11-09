// The 30 second refresh of the Overview (docs/architecture.md 「화면 구조 규칙」), the logic of the setInterval at the end of the legacy public/app.js.
// Pure and injected so the conditions can be tested without a browser; useDashboardAutoRefresh.ts wires it to the page.

export const AUTO_REFRESH_MS = 30000;
export const IDLE_LIMIT_MS = 300000;
export const SYNC_FAILED_TEXT = '자동 갱신 실패 · 새로고침으로 다시 확인하세요.';

export type RefreshGate = {
  /** The Overview is the screen on show. */
  readonly onOverview: boolean;
  /** `document.hidden`. */
  readonly hidden: boolean;
  /** Milliseconds since the last pointer or key input. */
  readonly idleMs: number;
  /** Some `<dialog>` is open. */
  readonly dialogOpen: boolean;
};

/** Legacy: `view!=='overview'||document.hidden||Date.now()-lastActivity>300000||dialog[open]` (the running flag is in createAutoRefresh). */
export function shouldSkip(gate: RefreshGate): boolean {
  return !gate.onOverview || gate.hidden || gate.idleMs > IDLE_LIMIT_MS || gate.dialogOpen;
}

/** The legacy interval ticks on a fixed grid from the page start; a screen that mounts later waits for the next grid point. */
export function nextTickDelay(epoch: number, now: number): number {
  return AUTO_REFRESH_MS - ((now - epoch) % AUTO_REFRESH_MS);
}

export type AutoRefreshDeps<T> = {
  gate(): RefreshGate;
  fetchTasks(): Promise<T>;
  /** After the answer: the Overview is still shown and no dialog opened meanwhile. */
  stillCurrent(): boolean;
  /** Stores the answer, records the time and redraws. */
  apply(fresh: T): void;
  /** Writes SYNC_FAILED_TEXT into the status line. */
  fail(): void;
};

export type TickResult = 'skipped' | 'applied' | 'dropped' | 'failed';

/** One timer tick. The returned function keeps the legacy `refreshingDashboard` flag: a tick never starts while one runs. */
export function createAutoRefresh<T>(deps: AutoRefreshDeps<T>): () => Promise<TickResult> {
  let running = false;
  return async () => {
    if (running || shouldSkip(deps.gate())) return 'skipped';
    running = true;
    try {
      const fresh = await deps.fetchTasks();
      if (!deps.stillCurrent()) return 'dropped';
      deps.apply(fresh);
      return 'applied';
    } catch {
      deps.fail();
      return 'failed';
    } finally {
      running = false;
    }
  };
}
