// Given / When / Then specs of the assignment use cases over a fake OrbitFunctions port.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AssignTaskService } from './AssignTaskService.ts';
import { GetKpiStatusService } from './GetKpiStatusService.ts';
import { MarkTestDataService } from './MarkTestDataService.ts';
import { KpiMigrationRequiredError, TaskRejectedError } from '../TaskRejectedError.ts';
import { AssigneeName } from '../../domain/AssigneeName.ts';
import { OrbitFunctionError } from '../../../shared/port/OrbitFunctions.ts';
import type { OrbitFunctionArguments, OrbitFunctionName, OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';

class FakeOrbit implements OrbitFunctions {
  readonly calls: Array<{ name: OrbitFunctionName; args: OrbitFunctionArguments }> = [];
  private readonly outcome: () => unknown;
  constructor(outcome: () => unknown) {
    this.outcome = outcome;
  }
  async call(name: OrbitFunctionName, args: OrbitFunctionArguments): Promise<unknown> {
    this.calls.push({ name, args });
    return this.outcome();
  }
}
const failing = (message: string, code: string | undefined) => () => {
  throw new OrbitFunctionError(message, code);
};

describe('AssignTaskService [R-020]', () => {
  it('Given a task / When it is assigned / Then orbit_kpi assign gets the task id and the trimmed name and the result is ok', async () => {
    const orbit = new FakeOrbit(() => ({ ok: true }));
    const result = await new AssignTaskService(orbit).assign({ taskId: 'task-1', assignee: AssigneeName.from('  김담당 ') });
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(orbit.calls, [{ name: 'orbit_kpi', args: { action: 'assign', payload: { id: 'task-1', assignee: '김담당' } } }]);
  });

  it('Given a missing task / When it is assigned / Then the task-missing rejection carries the database message', async () => {
    const service = new AssignTaskService(new FakeOrbit(failing('업무를 찾을 수 없습니다.', 'PT404')));
    await assert.rejects(
      service.assign({ taskId: 'x', assignee: AssigneeName.from('a') }),
      (e: unknown) => e instanceof TaskRejectedError && e.reason === 'not-found' && e.message === '업무를 찾을 수 없습니다.',
    );
  });

  it('maps PT400 to invalid and PT409 to conflict, and lets every other failure through untouched', async () => {
    const reasons = new Map([['PT400', 'invalid'], ['PT409', 'conflict']]);
    for (const [code, reason] of reasons) {
      await assert.rejects(
        new AssignTaskService(new FakeOrbit(failing('m', code))).assign({ taskId: 'x', assignee: AssigneeName.from('a') }),
        (e: unknown) => e instanceof TaskRejectedError && e.reason === reason,
        code,
      );
    }
    const outage = new OrbitFunctionError('connection reset with 홍길동', '08006');
    await assert.rejects(
      new AssignTaskService(new FakeOrbit(() => { throw outage; })).assign({ taskId: 'x', assignee: AssigneeName.from('a') }),
      (e: unknown) => e === outage,
    );
  });
});

describe('MarkTestDataService [R-021]', () => {
  it('Given a task / When the flag is set / Then orbit_kpi mark_test gets the id and the boolean', async () => {
    for (const isTest of [true, false]) {
      const orbit = new FakeOrbit(() => ({ ok: true }));
      assert.deepEqual(await new MarkTestDataService(orbit).mark({ taskId: 't', isTest }), { ok: true });
      assert.deepEqual(orbit.calls[0].args, { action: 'mark_test', payload: { id: 't', is_test: isTest } });
    }
  });

  it('Given a missing task / When the flag is set / Then the task-missing rejection is raised', async () => {
    await assert.rejects(
      new MarkTestDataService(new FakeOrbit(failing('업무를 찾을 수 없습니다.', 'PT404'))).mark({ taskId: 'x', isTest: true }),
      (e: unknown) => e instanceof TaskRejectedError && e.reason === 'not-found',
    );
  });
});

describe('GetKpiStatusService', () => {
  it('reports available when the extras can be read', async () => {
    const orbit = new FakeOrbit(() => []);
    assert.deepEqual(await new GetKpiStatusService(orbit).status(), { available: true });
    assert.deepEqual(orbit.calls[0], { name: 'orbit_kpi', args: { action: 'extras', payload: {} } });
  });

  it('reports unavailable with the setup message when the function does not exist (42883)', async () => {
    const service = new GetKpiStatusService(new FakeOrbit(failing('function public.orbit_kpi(text, jsonb) does not exist', '42883')));
    assert.deepEqual(await service.status(), { available: false, message: 'KPI 기능 DB 초기화가 필요합니다. supabase/kpi.sql을 SQL Editor에서 실행하세요.' });
  });

  it('does not hide any other database failure', async () => {
    const outage = new OrbitFunctionError('down', '57P01');
    await assert.rejects(new GetKpiStatusService(new FakeOrbit(() => { throw outage; })).status(), (e: unknown) => e === outage);
  });

  it('exposes the setup message as a dedicated error for the writes', () => {
    assert.equal(new KpiMigrationRequiredError().message, 'KPI 기능 DB 초기화가 필요합니다. supabase/kpi.sql을 SQL Editor에서 실행하세요.');
  });
});
