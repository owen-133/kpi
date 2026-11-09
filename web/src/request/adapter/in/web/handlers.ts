// Route handlers of the request context: read the HTTP request, call one use case, shape the legacy answer.
import { HttpError, jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import type { RouteContext } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import type { RequestUseCases } from '../../../application/port/in/RequestUseCases.ts';
import { withLegacyErrors } from './errorMapping.ts';
import { parseNewTask, parseNote, parseStatusChange } from './schemas.ts';
import type { ParseResult } from './schemas.ts';

// The pipeline already answers a viewer's write with this 403; a handler repeats it so it never relies on the pipeline alone.
function requireAdmin(context: RouteContext): void {
  if (context.role !== 'admin') throw new HttpError(403, '조회 계정은 업무를 변경할 수 없습니다.');
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
  };
}
