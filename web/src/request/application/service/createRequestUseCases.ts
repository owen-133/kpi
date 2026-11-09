import type { OrbitFunctionArguments, OrbitFunctionName, OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { RequestUseCases } from '../port/in/RequestUseCases.ts';
import { AddTaskNoteService } from './AddTaskNoteService.ts';
import { ChangeTaskLifecycleService } from './ChangeTaskLifecycleService.ts';
import { ChangeTaskStatusService } from './ChangeTaskStatusService.ts';
import { EditTaskService } from './EditTaskService.ts';
import { GetTaskDetailService } from './GetTaskDetailService.ts';
import { ListLifecycleHistoryService } from './ListLifecycleHistoryService.ts';
import { ListTasksService } from './ListTasksService.ts';
import { ListTrashService } from './ListTrashService.ts';
import { RegisterTaskService } from './RegisterTaskService.ts';

/** The database is opened on first use, so the container can build the use cases before any connection exists. */
export function createRequestUseCases(open: () => Promise<OrbitFunctions>): RequestUseCases {
  const functions: OrbitFunctions = {
    call: async (name: OrbitFunctionName, args: OrbitFunctionArguments) => (await open()).call(name, args),
  };
  return {
    listTasks: new ListTasksService(functions),
    getTaskDetail: new GetTaskDetailService(functions),
    registerTask: new RegisterTaskService(functions),
    changeTaskStatus: new ChangeTaskStatusService(functions),
    addTaskNote: new AddTaskNoteService(functions),
    editTask: new EditTaskService(functions),
    changeTaskLifecycle: new ChangeTaskLifecycleService(functions),
    listTrash: new ListTrashService(functions),
    listLifecycleHistory: new ListLifecycleHistoryService(functions),
  };
}
