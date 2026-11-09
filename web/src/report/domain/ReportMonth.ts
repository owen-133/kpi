// A reporting month is 'YYYY-MM' with month 01..12. Months are compared as text, like the legacy portal.
import { kstDayOf } from '../../shared/domain/kstDates.ts';
import { InvalidMonthError } from './ReportErrors.ts';

const MONTH_SHAPE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function assertReportMonth(month: string): void {
  if (!MONTH_SHAPE.test(month)) throw new InvalidMonthError();
}

/** KST month of an instant ('YYYY-MM'). */
export function currentMonth(nowIso: string): string {
  return kstDayOf(nowIso).slice(0, 7);
}

/** True when the month is after the current KST month. Only meaningful for months that passed assertReportMonth. */
export function isFutureMonth(month: string, nowIso: string): boolean {
  return month > currentMonth(nowIso);
}
