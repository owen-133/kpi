// Limits and shapes of a new work request, as the legacy portal enforces them before the database is called.
export const FIELD_MAX_LENGTH = 10000;

/** The nine fields a request is registered with, in the order the legacy server reads them. */
export const NEW_TASK_FIELDS = ['title', 'requester', 'department', 'channel', 'category', 'priority', 'requested_at', 'due_date', 'description'] as const;
export type NewTaskField = (typeof NEW_TASK_FIELDS)[number];
/** Every value is already trimmed text (possibly empty). */
export type NewTaskValues = Readonly<Record<NewTaskField, string>>;

/** Legacy `Number.isFinite(Date.parse(value))`: the request time only has to be something the JS engine reads as a time. */
export function isParsableInstant(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}
