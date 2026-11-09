import { elapsedSinceReceipt } from '../../../../domain/elapsedLabel.ts';
import type { BoardTask } from '../../../../domain/BoardTask.ts';
import type { DateField, GroupBy, StatusCount, TaskGroup } from '../../../../domain/groupTasks.ts';
import { assigneeLabel } from '../../../../domain/taskLabels.ts';
import { kstDayOf } from '../../../../../shared/domain/kstDates.ts';

const COMPLETED = '완료';
const MINUTE_MS = 60_000;
const SECOND_MS = 1000;
const DATE_ORDER = '최신 날짜순 · 같은 날짜는 상태순';
const STATUS_ORDER_TEXT = '접수 → 진행 중 → 대기 → 완료 순';
const BASIS_NOTE = '한국 날짜 기준';
const ACTIVITY_NOTE = '완료는 완료일, 미완료는 요청일';

export const GROUP_BY_OPTIONS: readonly { value: GroupBy; label: string }[] = [
  { value: 'date', label: '날짜별' },
  { value: 'category', label: '업무 분류별' },
  { value: 'department', label: '요청 부서별' },
  { value: 'channel', label: '접수 경로별' },
];

export const DATE_FIELD_OPTIONS: readonly { value: DateField; label: string }[] = [
  { value: 'activity', label: '처리일 (완료: 완료일 / 미완료: 요청일)' },
  { value: 'requested_at', label: '요청일' },
  { value: 'completed_at', label: '완료일' },
  { value: 'created_at', label: '등록일' },
];

// The line above the groups: how many there are, and how they are ordered and dated.
export function summaryLine(groupCount: number, taskCount: number, groupBy: GroupBy, dateField: DateField): { counts: string; order: string } {
  const notes = [groupBy === 'date' ? DATE_ORDER : STATUS_ORDER_TEXT, BASIS_NOTE];
  if (dateField === 'activity') notes.push(ACTIVITY_NOTE);
  return { counts: `${groupCount}개 그룹 · ${taskCount}건`, order: notes.join(' · ') };
}

export const groupSummary = (group: Pick<TaskGroup, 'totalCount' | 'openCount'>): string => `전체 ${group.totalCount}건 · 미완료 ${group.openCount}건`;

// A collapsed group is told by its first task: the raw title, without the test mark.
export const collapsedSummary = (first: BoardTask): string => `${first.status ?? ''} · ${first.title}`;

export const groupBadgeLabel = (counts: readonly StatusCount[]): string[] => counts.map((entry) => String(entry.count));

// Department and channel are joined on their own, so an empty pair still leaves its dot.
export function rowMeta(task: BoardTask): string {
  const where = [task.department, task.channel].filter((part) => (part ?? '').trim() !== '').join(' · ');
  return `${task.requester ?? ''} · ${where} · ${assigneeLabel(task)}`;
}

export function rowStatus(task: BoardTask): string {
  const priority = task.priority?.trim();
  return priority ? `${task.status ?? ''} · ${priority}` : (task.status ?? '');
}

// Finished work says so; everything else counts from the creation time. Under a minute it counts seconds.
export function receiptText(task: BoardTask, now: string): string {
  if (task.status === COMPLETED) return '처리 완료';
  const span = Date.parse(now) - Date.parse(task.created_at ?? '');
  if (Number.isFinite(span) && span >= 0 && span < MINUTE_MS) return `접수 후 ${Math.floor(span / SECOND_MS)}초`;
  return elapsedSinceReceipt(task.created_at, now);
}

export function isOverdue(task: BoardTask, now: string): boolean {
  const due = task.due_date?.trim() ?? '';
  return due !== '' && task.status !== COMPLETED && due < kstDayOf(now);
}

export function emptyMessage(taskCount: number, role: 'admin' | 'viewer', newTaskLabel: string): { title: string; body: string } {
  if (taskCount > 0) return { title: '조건에 맞는 업무가 없습니다.', body: '검색어나 상태 필터를 바꿔보세요.' };
  const body = role === 'viewer' ? '담당자가 등록한 업무가 이곳에 표시됩니다.' : `오른쪽 위 ${newTaskLabel} 버튼으로 구두·메신저 요청을 접수하세요.`;
  return { title: '첫 업무를 기록해 보세요.', body };
}
