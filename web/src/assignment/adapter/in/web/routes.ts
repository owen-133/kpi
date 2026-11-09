import { jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import type { RouteDefinition } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import type { AssignTaskUseCase } from '../../../application/port/in/AssignTaskUseCase.ts';
import type { GetKpiStatusQuery } from '../../../application/port/in/GetKpiStatusQuery.ts';
import type { MarkTestDataUseCase } from '../../../application/port/in/MarkTestDataUseCase.ts';
import { parseAssignBody, parseTestDataBody } from './assignmentSchemas.ts';
import { withHttpFailures } from './failures.ts';

export type AssignmentUseCases = {
  readonly assignTask: AssignTaskUseCase;
  readonly markTestData: MarkTestDataUseCase;
  readonly kpiStatus: GetKpiStatusQuery;
};

// Legacy server.js: the body is validated before the task is looked up; the task id is passed on as the raw path segment.
export function assignmentRoutes(useCases: AssignmentUseCases): readonly RouteDefinition[] {
  return [
    {
      method: 'GET',
      pattern: '/api/kpi-status',
      handler: () => withHttpFailures(async () => jsonResponse(200, await useCases.kpiStatus.status())),
    },
    {
      method: 'POST',
      pattern: /^\/api\/tasks\/([^/]+)\/test-data$/,
      handler: (context) =>
        withHttpFailures(async () => {
          const isTest = parseTestDataBody(context.body);
          return jsonResponse(200, await useCases.markTestData.mark({ taskId: context.params[0], isTest }));
        }),
    },
    {
      method: 'POST',
      pattern: /^\/api\/tasks\/([^/]+)\/assign$/,
      handler: (context) =>
        withHttpFailures(async () => {
          const assignee = parseAssignBody(context.body);
          return jsonResponse(200, await useCases.assignTask.assign({ taskId: context.params[0], assignee }));
        }),
    },
  ];
}
