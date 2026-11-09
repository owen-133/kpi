// Screen state of the portal shell (UI-DESIGN §3). It holds only what the legacy page kept in module variables
// (`view`, `lastRefreshed`) and what its DOM implied (which dialog is open, when a screen was drawn).
export type View = 'overview' | 'board' | 'report' | 'improvements';
export type DialogName = 'create' | 'improvement' | 'trash' | 'settings' | 'edit' | 'detail';
export type DialogSlot = { open: boolean; tick: number; taskId?: string; itemId?: string | null };
export type ShellState = {
  view: View;
  renderTick: number;
  reportMonth: string | null;
  lastRefreshed: string;
  syncFailed: boolean;
  dialogs: Record<DialogName, DialogSlot>;
};
export type ShellAction =
  | { type: 'navigate'; view: View }
  | { type: 'rendered' }
  | { type: 'refreshed'; at: string }
  | { type: 'syncFailed' }
  | { type: 'open'; dialog: DialogName; taskId?: string; itemId?: string | null }
  | { type: 'closed'; dialog: DialogName }
  | { type: 'reportMonth'; month: string };

export const VIEWS: readonly View[] = ['overview', 'board', 'report', 'improvements'];
// Body order of the legacy index.html.
export const DIALOG_NAMES: readonly DialogName[] = ['create', 'improvement', 'trash', 'settings', 'edit', 'detail'];

export function initialShellState(): ShellState {
  const dialogs = Object.fromEntries(DIALOG_NAMES.map((name) => [name, { open: false, tick: 0 }])) as Record<DialogName, DialogSlot>;
  // `lastRefreshed` is empty until the first load: a clock read while rendering would differ between server and browser.
  return { view: 'overview', renderTick: 0, reportMonth: null, lastRefreshed: '', syncFailed: false, dialogs };
}

/**
 * Legacy `render()` semantics, which this reducer reproduces:
 * - `render()` redraws the current screen from scratch, always, even when nothing changed. Here that is `renderTick + 1`;
 *   the shell mounts the screen with `key={renderTick}`, so every tick is a fresh mount (loading text included).
 * - The menu click handler sets `view` and calls `render()`: `navigate` changes the view AND bumps the tick, also when the
 *   view is the same one.
 * - `refresh()` stores the time and then calls `render()`: that is `refreshed` followed by `rendered`; `refreshed` alone does
 *   not bump the tick.
 * - A redraw rebuilds the sync status line, so a pending "automatic refresh failed" mark disappears on every render.
 * - A failed automatic refresh writes only the status line: `syncFailed`, no tick.
 * - The report month is a module variable of the legacy report code; it survives renders and menu changes.
 * A dialog slot's `tick` grows on every `open` (also of an open dialog), so the dialog body, keyed by it, is mounted anew.
 */
export function shellReducer(state: ShellState, action: ShellAction): ShellState {
  switch (action.type) {
    case 'navigate':
      return { ...state, view: action.view, renderTick: state.renderTick + 1, syncFailed: false };
    case 'rendered':
      return { ...state, renderTick: state.renderTick + 1, syncFailed: false };
    case 'refreshed':
      return { ...state, lastRefreshed: action.at };
    case 'syncFailed':
      return { ...state, syncFailed: true };
    case 'reportMonth':
      return { ...state, reportMonth: action.month };
    case 'open': {
      const slot: DialogSlot = { open: true, tick: state.dialogs[action.dialog].tick + 1 };
      if (action.taskId !== undefined) slot.taskId = action.taskId;
      if (action.itemId !== undefined) slot.itemId = action.itemId;
      return { ...state, dialogs: { ...state.dialogs, [action.dialog]: slot } };
    }
    case 'closed': {
      const slot = state.dialogs[action.dialog];
      if (!slot.open) return state;
      return { ...state, dialogs: { ...state.dialogs, [action.dialog]: { ...slot, open: false } } };
    }
  }
}
