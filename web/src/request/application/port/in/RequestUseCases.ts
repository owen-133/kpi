import type { AddTaskNoteUseCase } from './AddTaskNoteUseCase.ts';
import type { ChangeTaskLifecycleUseCase } from './ChangeTaskLifecycleUseCase.ts';
import type { ChangeTaskStatusUseCase } from './ChangeTaskStatusUseCase.ts';
import type { EditTaskUseCase } from './EditTaskUseCase.ts';
import type { GetTaskDetailQuery } from './GetTaskDetailQuery.ts';
import type { ListLifecycleHistoryQuery } from './ListLifecycleHistoryQuery.ts';
import type { ListTasksQuery } from './ListTasksQuery.ts';
import type { ListTrashQuery } from './ListTrashQuery.ts';
import type { RegisterTaskUseCase } from './RegisterTaskUseCase.ts';

/** The in-ports of the request context, as the driving adapter receives them. */
export type RequestUseCases = {
  readonly listTasks: ListTasksQuery;
  readonly getTaskDetail: GetTaskDetailQuery;
  readonly registerTask: RegisterTaskUseCase;
  readonly changeTaskStatus: ChangeTaskStatusUseCase;
  readonly addTaskNote: AddTaskNoteUseCase;
  readonly editTask: EditTaskUseCase;
  readonly changeTaskLifecycle: ChangeTaskLifecycleUseCase;
  readonly listTrash: ListTrashQuery;
  readonly listLifecycleHistory: ListLifecycleHistoryQuery;
};
