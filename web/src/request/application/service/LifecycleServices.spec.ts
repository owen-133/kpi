// R-031 R-026 R-027
// BDD of the edit, lifecycle and trash use cases over a scripted fake OrbitFunctions: what each asks the database, which
// function and action, and that refusals reach the caller unchanged. The SQL rules are proved over PGlite in the scenario spec.
import test from 'node:test';
import assert from 'node:assert/strict';
import { OrbitFunctionError } from '../../../shared/port/OrbitFunctions.ts';
import type { OrbitFunctionArguments, OrbitFunctionName, OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import { EditTaskService } from './EditTaskService.ts';
import { ChangeTaskLifecycleService } from './ChangeTaskLifecycleService.ts';
import { ListTrashService } from './ListTrashService.ts';
import { ListLifecycleHistoryService } from './ListLifecycleHistoryService.ts';

type Call = { readonly name: OrbitFunctionName; readonly args: OrbitFunctionArguments };
class FakeFunctions implements OrbitFunctions {
  readonly calls: Call[] = [];
  private readonly answer: unknown;
  constructor(answer: unknown) {
    this.answer = answer;
  }
  async call(name: OrbitFunctionName, args: OrbitFunctionArguments): Promise<unknown> {
    this.calls.push({ name, args });
    if (this.answer instanceof Error) throw this.answer;
    return this.answer;
  }
}
const values = { title: 't', requester: 'r', department: '', channel: '', category: '', priority: '', requested_at: '2026-11-03T01:00:00Z', due_date: '', description: '' };

test('Given trimmed values, a revision and a reason, When editing, Then orbit_edit_task (no action) gets id, values, revision and reason and its answer is returned', async () => {
  const fake = new FakeFunctions({ ok: true, revision: 1 });
  assert.deepEqual(await new EditTaskService(fake).edit({ id: 'a', values, revision: 0, reason: '정정' }), { ok: true, revision: 1 });
  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0].name, 'orbit_edit_task');
  assert.equal('action' in fake.calls[0].args, false, 'orbit_edit_task has no action argument');
  assert.deepEqual(fake.calls[0].args.payload, { id: 'a', values, revision: 0, reason: '정정' });
});

test('Given the database refuses the edit as stale, When editing, Then the refusal reaches the caller unchanged', async () => {
  const stale = new OrbitFunctionError('다른 화면에서 업무가 수정됐습니다. 상세를 다시 열어 확인하세요.', 'PT409');
  await assert.rejects(new EditTaskService(new FakeFunctions(stale)).edit({ id: 'a', values, revision: 3, reason: 'x' }), (e) => e === stale);
});

for (const action of ['delete', 'restore', 'purge'] as const) {
  test(`Given a ${action}, When changing the lifecycle, Then orbit_lifecycle ${action} gets id, reason and the confirmation as given`, async () => {
    const fake = new FakeFunctions({ ok: true });
    assert.deepEqual(await new ChangeTaskLifecycleService(fake).change({ id: 'a', action, reason: '사유', confirmation: '  제목  ' }), { ok: true });
    assert.deepEqual(fake.calls, [{ name: 'orbit_lifecycle', args: { action, payload: { id: 'a', reason: '사유', confirmation: '  제목  ' } } }]);
  });
}

test('Given the database refuses a purge, When changing the lifecycle, Then the refusal reaches the caller unchanged', async () => {
  const refusal = new OrbitFunctionError('업무 제목을 정확히 입력하세요.', 'PT400');
  await assert.rejects(new ChangeTaskLifecycleService(new FakeFunctions(refusal)).change({ id: 'a', action: 'purge', reason: 'x', confirmation: '' }), (e) => e === refusal);
});

test('Given trashed tasks, When listing the trash, Then orbit_lifecycle trash with an empty payload answers the rows as they are', async () => {
  const rows = [{ id: 'a', deleted_at: '2026-11-04T00:00:00Z' }];
  const fake = new FakeFunctions(rows);
  assert.deepEqual(await new ListTrashService(fake).list(), rows);
  assert.deepEqual(fake.calls, [{ name: 'orbit_lifecycle', args: { action: 'trash', payload: {} } }]);
});

test('Given lifecycle events, When listing the history, Then orbit_lifecycle history with an empty payload answers the rows as they are', async () => {
  const rows = [{ id: 2, action: 'delete' }, { id: 1, action: 'restore' }];
  const fake = new FakeFunctions(rows);
  assert.deepEqual(await new ListLifecycleHistoryService(fake).list(), rows);
  assert.deepEqual(fake.calls, [{ name: 'orbit_lifecycle', args: { action: 'history', payload: {} } }]);
});

test('Given the function is missing, When listing the trash or history, Then the failure is not swallowed', async () => {
  const missing = new OrbitFunctionError('function public.orbit_lifecycle(unknown, jsonb) does not exist', '42883');
  await assert.rejects(new ListTrashService(new FakeFunctions(missing)).list(), (e) => e === missing);
  await assert.rejects(new ListLifecycleHistoryService(new FakeFunctions(missing)).list(), (e) => e === missing);
});
