// Route handlers of the request context: read the HTTP request, call one use case, shape the legacy answer.
import { HttpError, jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import type { RouteContext } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import type { LifecycleAction } from '../../../domain/TaskLifecycle.ts';
import type { RequestUseCases } from '../../../application/port/in/RequestUseCases.ts';
import { withEditErrors, withLegacyErrors, withLifecycleErrors } from './errorMapping.ts';
import { parseEdit, parseLifecycle } from './lifecycleSchemas.ts';
import { parseNewTask, parseNote, parseStatusChange } from './schemas.ts';
import type { ParseResult } from './schemas.ts';

// The pipeline already answers a viewer's write with this 403; a handler repeats it so it never relies on the pipeline alone.
function requireAdmin(context: RouteContext): void {
  if (context.role !== 'admin') throw new HttpError(403, '조회 계정은 업무를 변경할 수 없습니다.');
}

// Legacy: the trash and the deletion history are for administrators only, and say so in their own words.
function requireAdminForTrash(context: RouteContext): void {
  if (context.role !== 'admin') throw new HttpError(403, '관리자만 휴지통과 삭제 이력을 볼 수 있습니다.');
}

function valid<T>(result: ParseResult<T>): T {
  if (!result.ok) throw new HttpError(400, result.message);
  return result.value;
}

export function createHandlers(useCases: RequestUseCases) {
  return {
    list: (): Promise<Response> => withLegacyErrors(async () => jsonResponse(200, await useCases.listTasks.list())),

    create: (context: RouteContext): Promise<Response> => {
      requireAdmin(context);
      const values = valid(parseNewTask(context.body));
      return withLegacyErrors(async () => jsonResponse(201, await useCases.registerTask.register(values)));
    },

    detail: (context: RouteContext): Promise<Response> =>
      withLegacyErrors(async () => {
        const task = await useCases.getTaskDetail.detail(context.params[0], context.role === 'admin');
        return task === null ? jsonResponse(404, { error: '업무를 찾을 수 없습니다.' }) : jsonResponse(200, task);
      }),

    changeStatus: (context: RouteContext): Promise<Response> => {
      requireAdmin(context);
      const { status, reason } = valid(parseStatusChange(context.body));
      return withLegacyErrors(async () => jsonResponse(200, await useCases.changeTaskStatus.change({ id: context.params[0], status, reason })));
    },

    addNote: (context: RouteContext): Promise<Response> => {
      requireAdmin(context);
      const { note } = valid(parseNote(context.body));
      return withLegacyErrors(async () => jsonResponse(201, await useCases.addTaskNote.add({ id: context.params[0], note })));
    },

    edit: (context: RouteContext): Promise<Response> => {
      requireAdmin(context);
      const { values, revision, reason } = valid(parseEdit(context.body));
      return withEditErrors(async () => jsonResponse(200, await useCases.editTask.edit({ id: context.params[0], values, revision, reason })));
    },

    lifecycle: (action: LifecycleAction) => (context: RouteContext): Promise<Response> => {
      requireAdmin(context);
      const { reason, confirmation } = valid(parseLifecycle(context.body));
      return withLifecycleErrors(async () => jsonResponse(200, await useCases.changeTaskLifecycle.change({ id: context.params[0], action, reason, confirmation })));
    },

    trash: (context: RouteContext): Promise<Response> => {
      requireAdminForTrash(context);
      return withLifecycleErrors(async () => jsonResponse(200, await useCases.listTrash.list()));
    },

    lifecycleHistory: (context: RouteContext): Promise<Response> => {
      requireAdminForTrash(context);
      return withLifecycleErrors(async () => jsonResponse(200, await useCases.listLifecycleHistory.list()));
    },
  };
}
