import { CallLog } from '../../../../../../shared/adapter/in/web/ui/testing/CallLog.ts';
import type { AssignmentApi, OkView } from '../AssignmentApi.ts';

export class FakeAssignmentApi implements AssignmentApi {
  readonly log = new CallLog();

  async assign(taskId: string, assignee: string): Promise<OkView> {
    this.log.record('assign', [taskId, assignee]);
    return { ok: true };
  }

  async markTestData(taskId: string, isTest: boolean): Promise<OkView> {
    this.log.record('markTestData', [taskId, isTest]);
    return { ok: true };
  }
}
