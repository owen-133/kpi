export interface ListTrashQuery {
  /** The deleted tasks, newest deletion first. */
  list(): Promise<unknown>;
}
