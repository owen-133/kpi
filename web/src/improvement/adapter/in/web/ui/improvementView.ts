// Display text of the improvement screen and dialog (legacy public/kpi-ui.js).
import { formatWhen } from '../../../../../shared/adapter/in/web/ui/format.ts';
import type { ImprovementHistoryEvent, ImprovementItem } from './ImprovementApi.ts';

/** The seven saved fields, in the order the history lists them. */
export const IMPROVEMENT_FIELD_KEYS = ['title', 'stage', 'source', 'feedback', 'action', 'result', 'status'] as const;

/** What an empty form shows before the first save. */
export const NEW_IMPROVEMENT_DEFAULTS = { stage: '본인 실사용', status: '접수' } as const;

export function filterByStage(items: readonly ImprovementItem[], stage: string): ImprovementItem[] {
  return items.filter((x) => !stage || x.stage === stage);
}

export const improvementSubtitle = (x: ImprovementItem): string =>
  `${x.stage} · ${x.source || '본인'} · ${formatWhen(x.updated_at)} · v${x.revision}`;

export const improvementDialogTitle = (item: ImprovementItem | undefined): string => (item ? '개선 기록' : '새 개선 기록');

export const historyMeta = (e: ImprovementHistoryEvent): string => `${formatWhen(e.at)} · ${e.actor}`;

// The changed fields, one per line; an empty text shows as a dash.
export function historyChangeText(e: ImprovementHistoryEvent): string {
  return IMPROVEMENT_FIELD_KEYS.filter((k) => e.before[k] !== e.after[k])
    .map((k) => `${k}: ${e.before[k] || '—'} → ${e.after[k] || '—'}`)
    .join('\n');
}
