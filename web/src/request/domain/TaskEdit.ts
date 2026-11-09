// Rules of correcting a registered request (R-031), as the legacy portal enforces them before the database is called.
// The SQL function orbit_edit_task stays the authority for the revision check, the trash check and the stored change set.
import { NEW_TASK_FIELDS } from './TaskLimits.ts';

/** The fields an edit may change: the same nine a request is registered with, in the same order. */
export const EDITABLE_FIELDS = NEW_TASK_FIELDS;
export const REASON_MAX_LENGTH = 1000;

/** `text` is already trimmed: a reason is 1..1000 characters. */
export function isReasonText(text: string): boolean {
  return text.length >= 1 && text.length <= REASON_MAX_LENGTH;
}

/** The edit revision the screen read: a non-negative integer (legacy `Number.isInteger(x) && x >= 0`). */
export function isRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
