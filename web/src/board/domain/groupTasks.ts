import { isValidDay, kstDayOf, weekdayOfDay } from '../../shared/domain/kstDates.ts';
import type { BoardTask } from './BoardTask.ts';
import { matchesQuery } from './taskSearch.ts';
import { compareStatus, statusRank, taskState, type TaskState } from './taskStatus.ts';

export type GroupBy = 'category' | 'department' | 'channel' | 'date';
// activity: completed tasks by completion day, every other task by request day.
export type DateField = 'activity' | 'requested_at' | 'completed_at' | 'created_at';

export interface GroupOptions {
  readonly query?: string;
  // '전체', '' or undefined show every status.
  readonly status?: string;
  readonly groupBy?: GroupBy;
  readonly dateField?: DateField;
  // KST days, inclusive; only used when grouping by date.
  readonly from?: string;
  readonly to?: string;
}

export interface StatusCount {
  readonly status: string;
  readonly count: number;
}

export interface TaskGroup {
  readonly name: string;
  // KST day of a dated group, null for every other group.
  readonly date: string | null;
  readonly tasks: readonly BoardTask[];
  readonly totalCount: number;
  readonly openCount: number;
  readonly statusCounts: readonly StatusCount[];
}

export class InvalidBoardFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBoardFilterError';
  }
}

const COMPLETED = '완료';
const UNGROUPED_NAME = '미분류';
const KOREAN = 'ko';

function byKoreanName(a: string, b: string): number {
  return a.localeCompare(b, KOREAN);
}

function dueDay(task: BoardTask): string {
  const due = task.due_date?.trim() ?? '';
  return isValidDay(due) ? due : '';
}

// Status order first, then the nearer due date (no due date last); equal tasks keep their input order.
function compareWithinGroup(a: BoardTask, b: BoardTask): number {
  const byStatus = compareStatus(a.status, b.status);
  if (byStatus !== 0) return byStatus;
  const dueA = dueDay(a);
  const dueB = dueDay(b);
  if (dueA === dueB) return 0;
  if (dueA === '') return 1;
  if (dueB === '') return -1;
  return dueA < dueB ? -1 : 1;
}

function countStatuses(tasks: readonly BoardTask[]): StatusCount[] {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    const status = task.status ?? '';
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => compareStatus(a, b)).map(([status, count]) => ({ status, count }));
}

function buildGroup(name: string, date: string | null, members: readonly BoardTask[]): TaskGroup {
  const tasks = [...members].sort(compareWithinGroup);
  return {
    name,
    date,
    tasks,
    totalCount: tasks.length,
    openCount: tasks.filter((task) => task.status !== COMPLETED).length,
    statusCounts: countStatuses(tasks),
  };
}

// The state of the group's first task decides how the whole group looks.
export function representativeState(group: TaskGroup): TaskState {
  return taskState(group.tasks[0]?.status);
}

// A group is urgent while its representative task is a received one nobody has started.
export function isUrgent(group: TaskGroup): boolean {
  return representativeState(group) === 'waiting';
}

export function splitCompleted(group: TaskGroup): { open: readonly BoardTask[]; completed: readonly BoardTask[] } {
  return {
    open: group.tasks.filter((task) => task.status !== COMPLETED),
    completed: group.tasks.filter((task) => task.status === COMPLETED),
  };
}

function textGroupName(task: BoardTask, groupBy: Exclude<GroupBy, 'date'>): string {
  return (task[groupBy] ?? '').trim() || UNGROUPED_NAME;
}

interface DayKey {
  readonly day: string; // '' when the task has no usable date
  readonly missingName: string;
}

function dayKeyOf(task: BoardTask, field: DateField): DayKey {
  switch (field) {
    case 'requested_at':
      return { day: kstDayOf(task.requested_at), missingName: '요청일 미상' };
    case 'created_at':
      return { day: kstDayOf(task.created_at), missingName: '등록일 미상' };
    case 'completed_at':
      return { day: kstDayOf(task.completed_at), missingName: '미완료' };
    case 'activity':
      return task.status === COMPLETED
        ? { day: kstDayOf(task.completed_at), missingName: '완료일 미상' }
        : { day: kstDayOf(task.requested_at), missingName: '요청일 미상' };
  }
}

function checkedDay(label: string, value: string | undefined): string {
  if (value === undefined || value === '') return '';
  if (!isValidDay(value)) throw new InvalidBoardFilterError(`${label}을 확인하세요.`);
  return value;
}

function groupByText(tasks: readonly BoardTask[], groupBy: Exclude<GroupBy, 'date'>): TaskGroup[] {
  const members = new Map<string, BoardTask[]>();
  for (const task of tasks) {
    const name = textGroupName(task, groupBy);
    members.set(name, [...(members.get(name) ?? []), task]);
  }
  return [...members.entries()]
    .map(([name, list]) => buildGroup(name, null, list))
    .sort((a, b) => statusRank(a.tasks[0]?.status) - statusRank(b.tasks[0]?.status) || byKoreanName(a.name, b.name));
}

function groupByDate(tasks: readonly BoardTask[], options: GroupOptions): TaskGroup[] {
  const field = options.dateField ?? 'activity';
  const from = checkedDay('시작일', options.from);
  const to = checkedDay('종료일', options.to);
  const ranged = from !== '' || to !== '';
  const dated = new Map<string, BoardTask[]>();
  const undated = new Map<string, BoardTask[]>();
  for (const task of tasks) {
    const { day, missingName } = dayKeyOf(task, field);
    if (day === '') {
      undated.set(missingName, [...(undated.get(missingName) ?? []), task]);
    } else if ((from === '' || day >= from) && (to === '' || day <= to)) {
      dated.set(day, [...(dated.get(day) ?? []), task]);
    }
  }
  const newestFirst = [...dated.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, list]) => buildGroup(`${day} (${weekdayOfDay(day)})`, day, list));
  if (ranged) return newestFirst;
  const rest = [...undated.entries()].sort(([a], [b]) => byKoreanName(a, b)).map(([name, list]) => buildGroup(name, null, list));
  return [...newestFirst, ...rest];
}

// Filters tasks by search text and status, then groups them for the board.
// Default grouping is by category; every group lists 접수 work first.
export function groupTasks(tasks: readonly BoardTask[], options: GroupOptions = {}): TaskGroup[] {
  const status = options.status ?? '';
  const visible = tasks.filter((task) => matchesQuery(task, options.query) && (status === '' || status === '전체' || task.status === status));
  const groupBy = options.groupBy ?? 'category';
  return groupBy === 'date' ? groupByDate(visible, options) : groupByText(visible, groupBy);
}
