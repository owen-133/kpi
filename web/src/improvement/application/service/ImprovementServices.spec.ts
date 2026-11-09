// R-025
import test from 'node:test';
import assert from 'node:assert/strict';
import { createImprovementUseCases } from './ImprovementServices.ts';
import { InvalidImprovementError } from '../../domain/ImprovementValue.ts';
import type { OrbitFunctionArguments, OrbitFunctionName, OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';

const valid = { title: '기한 누락', stage: 'MVP 구축', source: '팀장 시연', feedback: '기한 확인 어려움', action: '지표 추가', result: '', status: '접수' };

function fake() {
  const calls: Array<{ name: OrbitFunctionName; args: OrbitFunctionArguments }> = [];
  const orbit: OrbitFunctions = {
    async call(name, args) {
      calls.push({ name, args });
      return { id: 'saved' };
    },
  };
  return { calls, useCases: createImprovementUseCases(async () => orbit) };
}

test('Given a valid new entry, When saved, Then orbit_kpi improvement_save gets the trimmed value and no id', async () => {
  const { calls, useCases } = fake();
  await useCases.save.save({ id: undefined, revision: undefined, value: { ...valid, title: '  새 항목 ' } });
  assert.deepEqual(calls, [{ name: 'orbit_kpi', args: { action: 'improvement_save', payload: { id: undefined, revision: undefined, value: { ...valid, title: '새 항목' } } } }]);
});

test('Given an invalid value, When saved with or without an id, Then it is refused before any database call', async () => {
  const { calls, useCases } = fake();
  await assert.rejects(useCases.save.save({ id: 'x', revision: 99, value: { ...valid, title: '' } }), (e) => e instanceof InvalidImprovementError && e.message === '개선 제목과 피드백을 입력하세요.');
  await assert.rejects(useCases.save.save({ id: undefined, revision: undefined, value: null }), InvalidImprovementError);
  assert.equal(calls.length, 0);
});

test('Given an id, When the revision is missing, 0, "1", 1.5 or -1, Then 개선 항목 버전을 확인하세요 and no database call', async () => {
  const { calls, useCases } = fake();
  for (const revision of [undefined, 0, '1', 1.5, -1, null]) {
    await assert.rejects(useCases.save.save({ id: 'abc', revision, value: valid }), (e) => e instanceof InvalidImprovementError && e.message === '개선 항목 버전을 확인하세요.', String(revision));
  }
  assert.equal(calls.length, 0);
});

test('Given an empty id, When a revision is absent, Then it is a create (the revision is only demanded with an id)', async () => {
  const { calls, useCases } = fake();
  await useCases.save.save({ id: '', revision: 'ignored', value: valid });
  assert.equal(calls.length, 1);
});

test('Given an id and revision 1, When saved, Then both reach the database function', async () => {
  const { calls, useCases } = fake();
  await useCases.save.save({ id: 'abc', revision: 1, value: valid });
  assert.deepEqual((calls[0].args.payload as { id: string; revision: number }).revision, 1);
  assert.equal((calls[0].args.payload as { id: string }).id, 'abc');
});

test('Given list and history, When asked, Then they call improvements and improvement_history with the id', async () => {
  const { calls, useCases } = fake();
  await useCases.list.list();
  await useCases.history.history('some-id');
  assert.deepEqual(calls.map((c) => [c.name, c.args.action, c.args.payload]), [['orbit_kpi', 'improvements', {}], ['orbit_kpi', 'improvement_history', { id: 'some-id' }]]);
});
