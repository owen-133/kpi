export interface ListLifecycleHistoryQuery {
  /** The latest delete / restore / purge events, newest first. */
  list(): Promise<unknown>;
}
