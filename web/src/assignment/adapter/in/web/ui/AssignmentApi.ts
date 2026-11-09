import type { ApiClient } from '../../../../../shared/adapter/in/web/ui/apiClient.ts';

export type OkView = { readonly ok: true };

export interface AssignmentApi {
  assign(taskId: string, assignee: string): Promise<OkView>;
  markTestData(taskId: string, isTest: boolean): Promise<OkView>;
}

export function createAssignmentApi(client: ApiClient): AssignmentApi {
  return {
    assign: (taskId, assignee) => client.request<OkView>('tasks/' + taskId + '/assign', { assignee }),
    markTestData: (taskId, isTest) => client.request<OkView>('tasks/' + taskId + '/test-data', { is_test: isTest }),
  };
}
