// The improvement-ledger CSV of the legacy portal (public/kpi-ui.js). Its formula guard is its own rule: it also looks
// behind leading whitespace, unlike the task CSV (docs/architecture.md §8). The two are not unified.
import type { ImprovementItem } from './ImprovementApi.ts';

export const IMPROVEMENT_CSV_FILENAME = '개선이력관리대장.csv';

const COLUMN_KEYS = ['title', 'stage', 'source', 'feedback', 'action', 'result', 'status', 'created_at', 'updated_at', 'revision'] as const;
const HEADER = ['제목', '단계', '출처', '피드백', '개선내용', '검증결과', '상태', '등록', '수정', '버전'];

// legacy `cell`: quoted; a cell that starts (after any whitespace) with = + @ - gets an apostrophe in front; quotes doubled
export function improvementCsvCell(value: unknown): string {
  return '"' + String(value ?? '').replace(/^[\s]*[=+@-]/, "'$&").replaceAll('"', '""') + '"';
}

export function improvementCsv(items: readonly ImprovementItem[]): string {
  const rows: unknown[][] = [HEADER, ...items.map((x) => COLUMN_KEYS.map((k) => x[k]))];
  return rows.map((row) => row.map(improvementCsvCell).join(',')).join('\r\n');
}
