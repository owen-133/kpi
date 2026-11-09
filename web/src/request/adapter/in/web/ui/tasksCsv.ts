// Task list export of the legacy portal (public/app.js `exportCSV`).
// Cells go through the shared `csvCell`, the same formula guard as the improvement ledger export.
import { kstDayOf } from '../../../../../shared/domain/kstDates.ts';
import { csvCell } from '../../../../../shared/adapter/in/web/ui/csvCell.ts';
import type { TaskSummary } from './RequestApi.ts';

const COLUMNS = [
  ['title', '업무'],
  ['requester', '요청자'],
  ['department', '부서'],
  ['channel', '접수 경로'],
  ['category', '분류'],
  ['status', '상태'],
  ['requested_at', '요청일'],
  ['created_at', '등록 시각'],
  ['completed_at', '완료 시각'],
] as const;

/** Byte order mark, header, one row per task, CRLF between rows. `requested_at` is shown as its KST day. */
export function buildTasksCsv(tasks: readonly TaskSummary[]): string {
  const rows = [
    COLUMNS.map(([, label]) => label),
    ...tasks.map((t) => COLUMNS.map(([key]) => (key === 'requested_at' ? kstDayOf(t[key]) : t[key]))),
  ];
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export const tasksCsvFilename = (today: string): string => `총무업무_${today}.csv`;
