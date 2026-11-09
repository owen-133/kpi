import type { BoardTask } from './BoardTask.ts';

// Search covers title, requester, department, description and assignee; dates and category are not searched.
export function matchesQuery(task: BoardTask, query: string | null | undefined): boolean {
  const needle = (query ?? '').trim().toLowerCase();
  if (needle === '') return true;
  return [task.title, task.requester, task.department, task.description, task.assignee].some((field) => (field ?? '').toLowerCase().includes(needle));
}
