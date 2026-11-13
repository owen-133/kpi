import { checklistItems } from '../../../../../../request/domain/TaskChecklist.ts';
// What the Overview shows, computed from the task list: the pure part of the legacy `stats()`, `rows()`, `percent()` and
// `dashboardKpi()` of public/app.js. The component only places these values.
import { currentMonth } from '../../../../../../report/domain/ReportMonth.ts';
import { monthlyMetrics } from '../../../../../../report/domain/MonthlyMetrics.ts';
import type { TaskSummary } from '../../../../../../request/adapter/in/web/ui/RequestApi.ts';
import { completionPercent, formatDateTime, formatHours, formatPercent } from '../../../../../../shared/adapter/in/web/ui/format.ts';

type Texts = Readonly<Record<string, string>>;

export const PENDING_LIMIT = 5;

const real = (tasks: readonly TaskSummary[]): TaskSummary[] => tasks.filter((t) => !t.is_test);

/** Open real tasks by nearest due date (no date last), the first five. Array.sort is stable, so equal dates keep their order. */
export function pendingTasks(tasks: readonly TaskSummary[]): TaskSummary[] {
  return real(tasks)
    .filter((t) => t.status !== '완료')
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
    .slice(0, PENDING_LIMIT);
}

export type StatCard = { readonly label: string; readonly value: number; readonly caption: string };

export function statCards(tasks: readonly TaskSummary[], texts: Texts, today: string): StatCard[] {
  const measured = real(tasks);
  return [
    { label: texts.totalLabel, value: measured.length, caption: '실제 업무 기준 · 테스트 제외' },
    { label: texts.activeLabel, value: measured.filter((t) => t.status === '진행 중').length, caption: '현재 처리 중' },
    { label: texts.completedLabel, value: measured.filter((t) => t.status === '완료').length, caption: '처리 완료' },
    { label: texts.overdueLabel, value: measured.filter((t) => t.due_date && t.due_date < today && t.status !== '완료').length, caption: '미완료 업무 기준' },
  ];
}

export type Completion = { readonly percent: number; readonly real: number; readonly done: number };

export function completion(tasks: readonly TaskSummary[]): Completion {
  const measured = real(tasks);
  return { percent: completionPercent(tasks), real: measured.length, done: measured.filter((t) => t.status === '완료').length };
}

export type DueCell = { readonly kind: 'none' } | { readonly kind: 'date'; readonly value: string; readonly className: string };
export type RowView = {
  readonly checklistLabel?: string;
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly status: string;
  readonly statusClass: string;
  readonly due: DueCell;
};

// The class texts keep the legacy template's trailing space (`badge ` when no modifier applies).
export function taskRow(t: TaskSummary, today: string): RowView {
  const subtitle = `${t.requester}${t.department ? ' · ' + t.department : ''} · ${t.category}`;
  const modifier = t.status === '완료' ? 'done' : t.status === '대기' ? 'wait' : '';
  const due: DueCell = t.due_date
    ? { kind: 'date', value: t.due_date, className: `badge ${t.due_date < today && t.status !== '완료' ? 'urgent' : ''}` }
    : { kind: 'none' };
  const items = checklistItems(t.description || '');
  const checklist = items.length ? { checklistLabel: `하위 업무 ${items.filter(item => item.done).length}/${items.length} 완료` } : {};
  return { ...checklist, id: t.id, title: t.title, subtitle, status: t.status, statusClass: `badge ${modifier}`, due };
}

export type KpiStrip = {
  readonly excluded: string;
  readonly received: string;
  readonly completed: string;
  readonly onTime: string;
  readonly average: string;
};

/** The "this month" strip: figures of the current KST month at `nowIso`. */
export function kpiStrip(tasks: readonly TaskSummary[], nowIso: string): KpiStrip {
  const m = monthlyMetrics(tasks, currentMonth(nowIso), nowIso);
  return {
    excluded: `테스트 ${m.excludedTests}건 제외 · 활성 대시보드 30초 갱신`,
    received: `${m.received}건`,
    completed: `${m.completed}건`,
    onTime: formatPercent(m.completionRate),
    average: formatHours(m.averageHours),
  };
}

export const syncStatusText = (lastRefreshed: string): string => `최근 갱신 ${formatDateTime(lastRefreshed)}`;
