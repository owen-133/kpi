import { groupTasks, InvalidBoardFilterError, type DateField, type GroupBy, type TaskGroup } from '../../../../domain/groupTasks.ts';
import type { BoardTask } from '../../../../domain/BoardTask.ts';

export const ALL_STATUSES = '전체';

// What the board remembers while it is on screen. Filters live here; the task list comes from the shared query.
export type BoardState = {
  readonly status: string;
  readonly query: string;
  readonly groupBy: GroupBy;
  readonly dateField: DateField;
  readonly from: string;
  readonly to: string;
  readonly compact: boolean;
  // Keys of collapsed groups and of groups whose completed history is shown.
  readonly collapsed: readonly string[];
  readonly historyOpen: readonly string[];
  // Instant the "접수 후 …" labels count to; it moves when the board is refreshed.
  readonly now: string;
};

export type BoardAction =
  | { type: 'status'; status: string }
  | { type: 'query'; query: string }
  | { type: 'groupBy'; groupBy: GroupBy }
  | { type: 'dateField'; dateField: DateField }
  | { type: 'from'; day: string }
  | { type: 'to'; day: string }
  | { type: 'resetRange' }
  | { type: 'toggleCompact' }
  | { type: 'toggleGroup'; key: string }
  | { type: 'toggleHistory'; key: string }
  | { type: 'clock'; now: string };

export function initialBoardState(now: string): BoardState {
  return { status: ALL_STATUSES, query: '', groupBy: 'date', dateField: 'activity', from: '', to: '', compact: false, collapsed: [], historyOpen: [], now };
}

// A group name only identifies a group inside one grouping.
export const groupKey = (groupBy: GroupBy, name: string): string => `${groupBy}:${name}`;

const flip = (list: readonly string[], key: string): readonly string[] => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'status':
      return { ...state, status: action.status };
    case 'query':
      return { ...state, query: action.query };
    case 'groupBy':
      return { ...state, groupBy: action.groupBy };
    case 'dateField':
      return { ...state, dateField: action.dateField };
    case 'from':
      return { ...state, from: action.day };
    case 'to':
      return { ...state, to: action.day };
    case 'resetRange':
      return { ...state, from: '', to: '' };
    case 'toggleCompact':
      return { ...state, compact: !state.compact };
    case 'toggleGroup':
      return { ...state, collapsed: flip(state.collapsed, action.key) };
    case 'toggleHistory':
      return { ...state, historyOpen: flip(state.historyOpen, action.key) };
    case 'clock':
      return { ...state, now: action.now };
  }
}

// An unusable day in the range shows no groups; the date inputs only produce usable days or nothing.
export function visibleGroups(tasks: readonly BoardTask[], state: BoardState): TaskGroup[] {
  try {
    return groupTasks(tasks, { query: state.query, status: state.status, groupBy: state.groupBy, dateField: state.dateField, from: state.from, to: state.to });
  } catch (error) {
    if (error instanceof InvalidBoardFilterError) return [];
    throw error;
  }
}
