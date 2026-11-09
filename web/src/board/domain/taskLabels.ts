import type { BoardTask } from './BoardTask.ts';

const TEST_MARK = '[테스트]';

// Title as shown in a list: tasks flagged as test data carry a mark so nobody reads them as real work.
export function displayTitle(task: BoardTask): string {
  return task.is_test === true ? `${TEST_MARK} ${task.title}` : task.title;
}

export function assigneeLabel(task: BoardTask): string {
  return `담당 ${task.assignee?.trim() || '미배정'}`;
}

export function dueLabel(task: BoardTask): string {
  return `기한 ${task.due_date?.trim() || '미지정'}`;
}
