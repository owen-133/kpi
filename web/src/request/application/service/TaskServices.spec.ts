// R-001 R-002 R-003 R-004 R-006
// BDD of the five use cases over a scripted fake OrbitFunctions: what each use case asks the database, in which order,
// and what it hands back. The SQL rules themselves are proved over PGlite in the adapter scenario spec.
import test from 'node:test';
import assert from 'node:assert/strict';
import { OrbitFunctionError } from '../../../shared/port/OrbitFunctions.ts';
import type { OrbitFunctionArguments, OrbitFunctionName, OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import { ListTasksService } from './ListTasksService.ts';
import { GetTaskDetailService, KPI_MIGRATION_MESSAGE } from './GetTaskDetailService.ts';
import { RegisterTaskService } from './RegisterTaskService.ts';
import { ChangeTaskStatusService } from './ChangeTaskStatusService.ts';
import { AddTaskNoteService } from './AddTaskNoteService.ts';

type Call = { readonly name: OrbitFunctionName; readonly action: string | undefined; readonly payload: unknown };
class FakeFunctions implements OrbitFunctions {
  readonly calls: Call[] = [];
  private readonly answers = new Map<string, unknown>();
  answer(name: OrbitFunctionName, action: string, value: unknown): this {
    this.answers.set(`${name}/${action}`, value);
    return this;
  }
  async call(name: OrbitFunctionName, args: OrbitFunctionArguments): Promise<unknown> {
    this.calls.push({ name, action: args.action, payload: args.payload });
    const value = this.answers.get(`${name}/${args.action}`);
    if (value instanceof Error) throw value;
    return value;
  }
}
const missingKpiFunction = () => new OrbitFunctionError('function public.orbit_kpi(unknown, jsonb) does not exist', '42883');
const notFound = () => new OrbitFunctionError('업무를 찾을 수 없습니다.', 'PT404');

test('Given tasks and extras, When listing, Then each task carries the extras of its own id and others are untouched', async () => {
  const fake = new FakeFunctions()
    .answer('orbit_api', 'list', [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }])
    .answer('orbit_kpi', 'extras', [{ task_id: 'b', assignee: '김', assigned_at: null, is_test: true }]);
  const tasks = await new ListTasksService(fake).list();
  assert.deepEqual(tasks, [{ id: 'a', title: 'A' }, { id: 'b', title: 'B', task_id: 'b', assignee: '김', assigned_at: null, is_test: true }]);
  assert.deepEqual(fake.calls.map((c) => `${c.name}/${c.action}`), ['orbit_api/list', 'orbit_kpi/extras']);
});

test('Given the KPI function is not installed, When listing, Then the plain tasks are returned', async () => {
  const fake = new FakeFunctions().answer('orbit_api', 'list', [{ id: 'a' }]).answer('orbit_kpi', 'extras', missingKpiFunction());
  assert.deepEqual(await new ListTasksService(fake).list(), [{ id: 'a' }]);
});

test('Given the list itself fails or the KPI call fails for another reason, When listing, Then the error is not swallowed', async () => {
  const listFails = new FakeFunctions().answer('orbit_api', 'list', new OrbitFunctionError('boom', 'XX000'));
  await assert.rejects(new ListTasksService(listFails).list(), /boom/);
  const kpiFails = new FakeFunctions().answer('orbit_api', 'list', []).answer('orbit_kpi', 'extras', new OrbitFunctionError('denied', '42501'));
  await assert.rejects(new ListTasksService(kpiFails).list(), /denied/);
});

test('Given a live task, When detail, Then the task carries its KPI detail and the admin flag is passed as include_deleted', async () => {
  const fake = new FakeFunctions()
    .answer('orbit_api', 'detail', { id: 'a', deleted_at: null, events: [] })
    .answer('orbit_kpi', 'detail', { files: [], available: true });
  const task = await new GetTaskDetailService(fake).detail('a', true);
  assert.deepEqual(task, { id: 'a', deleted_at: null, events: [], kpi: { files: [], available: true } });
  assert.deepEqual(fake.calls[0].payload, { id: 'a', include_deleted: true });
  await new GetTaskDetailService(fake).detail('a', false);
  assert.deepEqual(fake.calls[2].payload, { id: 'a', include_deleted: false });
});

test('Given an unknown id, When detail, Then null comes back and the KPI function is not asked', async () => {
  const fake = new FakeFunctions().answer('orbit_api', 'detail', null);
  assert.equal(await new GetTaskDetailService(fake).detail('x', true), null);
  assert.equal(fake.calls.length, 1);
});

test('Given a deleted task shown to an admin, When detail, Then it has no KPI part and no KPI call is made', async () => {
  const fake = new FakeFunctions().answer('orbit_api', 'detail', { id: 'a', deleted_at: '2026-11-04T00:00:00Z', events: [] });
  const task = await new GetTaskDetailService(fake).detail('a', true);
  assert.deepEqual(task, { id: 'a', deleted_at: '2026-11-04T00:00:00Z', events: [] });
  assert.equal(fake.calls.length, 1);
});

test('Given the KPI function is not installed, When detail, Then kpi says unavailable with the install message and no files', async () => {
  const fake = new FakeFunctions().answer('orbit_api', 'detail', { id: 'a', deleted_at: null }).answer('orbit_kpi', 'detail', missingKpiFunction());
  const task = await new GetTaskDetailService(fake).detail('a', true);
  assert.deepEqual(task?.kpi, { available: false, message: KPI_MIGRATION_MESSAGE, files: [] });
  assert.equal(KPI_MIGRATION_MESSAGE, 'KPI 기능 DB 초기화가 필요합니다. supabase/kpi.sql을 SQL Editor에서 실행하세요.');
});

test('Given the KPI detail finds no live task, When detail, Then the not-found error is not swallowed', async () => {
  const fake = new FakeFunctions().answer('orbit_api', 'detail', { id: 'a', deleted_at: null }).answer('orbit_kpi', 'detail', notFound());
  await assert.rejects(new GetTaskDetailService(fake).detail('a', true), /업무를 찾을 수 없습니다/);
});

const values = { title: 't', requester: 'r', department: '', channel: '', category: '', priority: '', requested_at: '2026-11-03T01:00:00Z', due_date: '', description: '' };

test('Given trimmed values, When register, Then orbit_api create gets exactly those values and its id is returned', async () => {
  const fake = new FakeFunctions().answer('orbit_api', 'create', { id: 'new-id' });
  assert.deepEqual(await new RegisterTaskService(fake).register(values), { id: 'new-id' });
  assert.deepEqual(fake.calls, [{ name: 'orbit_api', action: 'create', payload: values }]);
});

test('Given a status change, When changing, Then orbit_api status gets id, status and reason and its answer is returned', async () => {
  const fake = new FakeFunctions().answer('orbit_api', 'status', { ok: true });
  assert.deepEqual(await new ChangeTaskStatusService(fake).change({ id: 'a', status: '완료', reason: '' }), { ok: true });
  assert.deepEqual(fake.calls, [{ name: 'orbit_api', action: 'status', payload: { id: 'a', status: '완료', reason: '' } }]);
});

test('Given the database refuses the status change, When changing, Then the refusal reaches the caller unchanged', async () => {
  const refusal = new OrbitFunctionError('완료 업무를 재개하는 사유를 입력하세요.', 'PT400');
  const fake = new FakeFunctions().answer('orbit_api', 'status', refusal);
  await assert.rejects(new ChangeTaskStatusService(fake).change({ id: 'a', status: '진행 중', reason: '' }), (e) => e === refusal);
});

test('Given a note, When adding, Then orbit_api note gets id and note and its answer is returned', async () => {
  const fake = new FakeFunctions().answer('orbit_api', 'note', { ok: true });
  assert.deepEqual(await new AddTaskNoteService(fake).add({ id: 'a', note: '메모' }), { ok: true });
  assert.deepEqual(fake.calls, [{ name: 'orbit_api', action: 'note', payload: { id: 'a', note: '메모' } }]);
});
