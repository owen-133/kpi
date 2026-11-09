// R-030
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OrbitFunctionError } from '../../../shared/port/OrbitFunctions.ts';
import type { OrbitFunctionName, OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import { createAutomationUseCases } from './createAutomationUseCases.ts';

type Answers = Partial<Record<OrbitFunctionName, unknown>>;

function fakeDatabase(answers: Answers) {
  const calls: Array<[OrbitFunctionName, string | undefined]> = [];
  const functions: OrbitFunctions = {
    async call(name, args) {
      calls.push([name, args.action]);
      const answer = answers[name];
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
  return { calls, suggest: createAutomationUseCases(async () => functions).suggestForRequest };
}

const stored = (categories?: string[]) => ({ values: categories ? { categories } : {}, revision: 0, available: true });
const missing = (code = 'PGRST202') => new OrbitFunctionError('function does not exist', code);

describe('Given stored settings and tasks, when suggestions are requested', () => {
  it('Then the category comes from the configured categories and the similar tasks from the stored tasks', async () => {
    const { suggest, calls } = fakeDatabase({
      orbit_settings: stored(['우리 비품', '기타']),
      orbit_api: [{ id: 'a', title: '신규 입사자 노트북', description: '', status: '접수' }],
      orbit_kpi: [],
    });
    const result = await suggest.suggest('신규 입사자 노트북');
    assert.equal(result.classification.category, '우리 비품');
    assert.deepEqual(result.similar, [{ id: 'a', title: '신규 입사자 노트북', status: '접수', score: 100 }]);
    assert.equal(result.method, '규칙·텍스트 유사도 기반 자동화 (생성형 AI 미사용)');
    assert.deepEqual(calls, [['orbit_settings', 'get'], ['orbit_api', 'list'], ['orbit_kpi', 'extras']]);
  });

  it('Then a task marked as test data in its extras is left out', async () => {
    const { suggest } = fakeDatabase({
      orbit_settings: stored(),
      orbit_api: [{ id: 'a', title: '프린터 토너', description: '' }, { id: 'b', title: '프린터 토너', description: '' }],
      orbit_kpi: [{ task_id: 'a', is_test: true }],
    });
    assert.deepEqual((await suggest.suggest('프린터 토너')).similar.map((t) => t.id), ['b']);
  });

  it('Then settings that were never saved give the default categories', async () => {
    const { suggest } = fakeDatabase({ orbit_settings: stored(), orbit_api: [], orbit_kpi: [] });
    assert.equal((await suggest.suggest('노트북')).classification.category, '비품·자산');
    assert.equal((await suggest.suggest('안녕하세요')).classification.category, '일반 총무');
  });
});

describe('Given parts of the database that are not installed, when suggestions are requested', () => {
  it('Then missing settings give the default categories', async () => {
    for (const code of ['PGRST202', '42883']) {
      const { suggest } = fakeDatabase({ orbit_settings: missing(code), orbit_api: [], orbit_kpi: [] });
      assert.equal((await suggest.suggest('노트북')).classification.category, '비품·자산', code);
    }
  });
  it('Then missing task extras give no extras, so every stored task is a candidate', async () => {
    const { suggest } = fakeDatabase({ orbit_settings: stored(), orbit_api: [{ id: 'a', title: '프린터 토너', description: '' }], orbit_kpi: missing() });
    assert.deepEqual((await suggest.suggest('프린터 토너')).similar.map((t) => t.id), ['a']);
  });
});

describe('Given a database failure, when suggestions are requested', () => {
  it('Then an unexpected error is not swallowed, wherever it happens', async () => {
    const boom = new OrbitFunctionError('boom', '08006');
    for (const failing of ['orbit_settings', 'orbit_api', 'orbit_kpi'] as const) {
      const answers: Answers = { orbit_settings: stored(), orbit_api: [], orbit_kpi: [], [failing]: boom };
      await assert.rejects(fakeDatabase(answers).suggest.suggest('노트북'), (e: unknown) => e === boom, failing);
    }
  });
  it('Then a missing task function is not hidden (only settings and extras may be missing)', async () => {
    const { suggest } = fakeDatabase({ orbit_settings: stored(), orbit_api: missing(), orbit_kpi: [] });
    await assert.rejects(suggest.suggest('노트북'), OrbitFunctionError);
  });
});
