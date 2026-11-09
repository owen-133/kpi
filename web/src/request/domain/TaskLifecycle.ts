// The three trash actions of a request (R-026 delete and restore, R-027 purge). Which of them the database accepts in
// which state, and the purge title confirmation, are decided by orbit_lifecycle.
export const LIFECYCLE_ACTIONS = ['delete', 'restore', 'purge'] as const;
export type LifecycleAction = (typeof LIFECYCLE_ACTIONS)[number];

export function isLifecycleAction(value: unknown): value is LifecycleAction {
  return typeof value === 'string' && (LIFECYCLE_ACTIONS as readonly string[]).includes(value);
}
