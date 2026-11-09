// The improvement-ledger CSV of the legacy portal (public/kpi-ui.js). Cells go through the shared `csvCell`, the same
// formula guard as the task CSV.
import { csvCell } from '../../../../../shared/adapter/in/web/ui/csvCell.ts';
import type { ImprovementItem } from './ImprovementApi.ts';

export const IMPROVEMENT_CSV_FILENAME = '개선이력관리대장.csv';

const COLUMN_KEYS = ['title', 'stage', 'source', 'feedback', 'action', 'result', 'status', 'created_at', 'updated_at', 'revision'] as const;
const HEADER = ['제목', '단계', '출처', '피드백', '개선내용', '검증결과', '상태', '등록', '수정', '버전'];

export function improvementCsv(items: readonly ImprovementItem[]): string {
  const rows: unknown[][] = [HEADER, ...items.map((x) => COLUMN_KEYS.map((k) => x[k]))];
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
