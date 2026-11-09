// What the detail dialog shows, as plain data (legacy `detail()` of public/app.js).
import { kstDayOf } from '../../../../../../shared/domain/kstDates.ts';
import { formatDateTime } from '../../../../../../shared/adapter/in/web/ui/format.ts';
import type { TaskDetailView, TaskEventView } from '../RequestApi.ts';

export const STATUSES: readonly string[] = ['접수', '진행 중', '대기', '완료'];

/** The tools (status, memo, edit, delete, extensions) belong to an admin on a task that is not in the trash. */
export function isEditable(role: string, task: Pick<TaskDetailView, 'deleted_at'>): boolean {
  return role === 'admin' && !task.deleted_at;
}

// legacy `badge`: the trailing space of the plain badge is part of the class text
export const badgeClass = (status: string): string => `badge ${status === '완료' ? 'done' : status === '대기' ? 'wait' : ''}`;

export function detailMeta(t: TaskDetailView): ReadonlyArray<readonly [string, string]> {
  return [
    ['요청자', t.requester],
    ['부서', t.department || '—'],
    ['접수 경로', t.channel],
    ['분류 · 우선순위', t.category + ' · ' + t.priority],
    ['요청일', t.requested_at ? kstDayOf(t.requested_at) : '—'],
    ['시스템 등록 시각', formatDateTime(t.created_at)],
    ['처리 기한', t.due_date || '—'],
    ['완료 시각', formatDateTime(t.completed_at)],
  ];
}

export function timelineEvents(events: readonly TaskEventView[]): TaskEventView[] {
  return events.slice().reverse();
}

/** legacy bindTaskExtensions: a deleted task first, then the missing KPI tables, otherwise the tools. */
export function extensionKind(task: TaskDetailView): 'deleted' | 'unavailable' | 'tools' {
  if (task.deleted_at) return 'deleted';
  return task.kpi?.available ? 'tools' : 'unavailable';
}
