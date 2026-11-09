// KST (UTC+9) calendar-day rules shared by every context.
// A "day" is a 'YYYY-MM-DD' string; an "instant" is any string Date.parse understands.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export class InvalidRequestDateError extends Error {
  constructor() {
    super('요청일을 확인하세요.');
    this.name = 'InvalidRequestDateError';
  }
}

// True only for a real calendar day written as YYYY-MM-DD ('2026-02-31' is not one).
export function isValidDay(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY_SHAPE.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

// KST calendar day of an instant, or '' when the value is missing or not a date.
export function kstDayOf(instant: string | null | undefined): string {
  if (typeof instant !== 'string') return '';
  const parsed = Date.parse(instant);
  return Number.isFinite(parsed) ? new Date(parsed + KST_OFFSET_MS).toISOString().slice(0, 10) : '';
}

// Value stored for a request date typed as a day: KST midnight as a UTC ISO string.
// Re-entering the same KST day keeps the precise timestamp that was already stored.
export function requestTimestampFor(day: string, previous?: string | null): string {
  if (!isValidDay(day)) throw new InvalidRequestDateError();
  if (previous && kstDayOf(previous) === day) return previous;
  return new Date(`${day}T00:00:00+09:00`).toISOString();
}

// Korean weekday letter of a calendar day.
export function weekdayOfDay(day: string): string {
  if (!isValidDay(day)) throw new InvalidRequestDateError();
  return WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];
}
