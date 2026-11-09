// R-028 R-029
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OrbitFunctionError } from '../../../shared/port/OrbitFunctions.ts';
import type { OrbitFunctionArguments, OrbitFunctionName, OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import { DEFAULT_SETTINGS, SettingsValidationError } from '../../domain/PortalSettings.ts';
import { SettingsAccessDeniedError } from '../../domain/SettingsAccess.ts';
import { createSettingsUseCases } from './createSettingsUseCases.ts';
import { SettingsMigrationRequiredError } from '../port/in/SettingsMigrationRequiredError.ts';

type Call = { readonly name: OrbitFunctionName; readonly args: OrbitFunctionArguments };

/** A fake database: remembers every call and answers with what the test arranged. */
function fakeDatabase(answer: (call: Call) => unknown) {
  const calls: Call[] = [];
  const functions: OrbitFunctions = {
    async call(name, args) {
      calls.push({ name, args });
      const result = answer({ name, args });
      if (result instanceof Error) throw result;
      return result;
    },
  };
  return { calls, useCases: createSettingsUseCases(async () => functions) };
}

const MIGRATION_TEXT = '관리자 설정 DB 초기화가 필요합니다. supabase/settings.sql을 SQL Editor에서 실행하세요.';

describe('Given a stored configuration, when the settings are read', () => {
  it('Then the stored values are completed from the defaults and revision and availability are passed on', async () => {
    const { useCases, calls } = fakeDatabase(() => ({ values: { showBanner: false }, revision: 4, available: true }));
    const view = await useCases.getSettings.get();
    assert.equal(view.revision, 4);
    assert.equal(view.available, true);
    assert.equal((view.values as { showBanner: boolean }).showBanner, false);
    assert.deepEqual((view.values as { categories: string[] }).categories, DEFAULT_SETTINGS.categories);
    assert.deepEqual(calls.map((c) => [c.name, c.args.action]), [['orbit_settings', 'get']]);
  });

  it('Then an empty database gives the defaults at revision 0', async () => {
    const { useCases } = fakeDatabase(() => ({ values: {}, revision: 0, available: true }));
    assert.deepEqual((await useCases.getSettings.get()).values, DEFAULT_SETTINGS);
  });

  it('Then a database without the settings function answers the defaults, unavailable, with the setup message', async () => {
    for (const code of ['PGRST202', '42883']) {
      const { useCases } = fakeDatabase(() => new OrbitFunctionError('function does not exist', code));
      assert.deepEqual(await useCases.getSettings.get(), { values: DEFAULT_SETTINGS, revision: 0, available: false, message: MIGRATION_TEXT }, code);
    }
  });

  it('Then any other database error is not swallowed', async () => {
    const { useCases } = fakeDatabase(() => new OrbitFunctionError('boom', '08006'));
    await assert.rejects(useCases.getSettings.get(), OrbitFunctionError);
  });
});

describe('Given an administrator saves settings', () => {
  const save = (useCases: ReturnType<typeof fakeDatabase>['useCases'], values: unknown, revision = 0, actor: 'admin' | 'viewer' = 'admin') =>
    useCases.saveSettings.save({ actor, revision, values });

  it('Then the validated values and the revision are sent to the save action and the stored answer is returned', async () => {
    const { useCases, calls } = fakeDatabase(({ args }) => ({ values: (args.payload as { values: unknown }).values, revision: 1, available: true }));
    const result = await save(useCases, { texts: { portalName: '  우리 회사  ' } });
    assert.deepEqual(calls.map((c) => [c.name, c.args.action]), [['orbit_settings', 'save']]);
    const sent = calls[0].args.payload as { values: { texts: Record<string, string>; categories: string[] }; revision: number };
    assert.equal(sent.revision, 0);
    assert.equal(sent.values.texts.portalName, '우리 회사');
    assert.deepEqual(sent.values.categories, DEFAULT_SETTINGS.categories);
    assert.equal((result as { revision: number }).revision, 1);
  });

  it('Then an invalid value is refused before the database is touched', async () => {
    const { useCases, calls } = fakeDatabase(() => ({}));
    await assert.rejects(save(useCases, { ...DEFAULT_SETTINGS, primaryColor: 'red' }, 99), (e: unknown) => e instanceof SettingsValidationError && e.message === '색상 형식을 확인하세요.');
    assert.equal(calls.length, 0);
  });

  it('Then a stale revision is reported by the database as a conflict and passed on unchanged', async () => {
    const conflict = new OrbitFunctionError('다른 화면에서 설정이 변경됐습니다. 다시 불러온 뒤 저장하세요.', 'PT409');
    const { useCases } = fakeDatabase(() => conflict);
    await assert.rejects(save(useCases, DEFAULT_SETTINGS, 0), (e: unknown) => e === conflict);
  });

  it('Then a viewer cannot save and the database is not touched, even with valid values', async () => {
    const { useCases, calls } = fakeDatabase(() => ({}));
    await assert.rejects(save(useCases, DEFAULT_SETTINGS, 0, 'viewer'), (e: unknown) => e instanceof SettingsAccessDeniedError && e.message === '조회 계정은 업무를 변경할 수 없습니다.');
    assert.equal(calls.length, 0);
  });

  it('Then a missing settings function on save is a setup error with the setup message', async () => {
    const { useCases } = fakeDatabase(() => new OrbitFunctionError('x', 'PGRST202'));
    await assert.rejects(save(useCases, DEFAULT_SETTINGS), (e: unknown) => e instanceof SettingsMigrationRequiredError && e.message === MIGRATION_TEXT);
  });
});

describe('Given the settings history is requested', () => {
  it('Then an administrator gets the history list as stored', async () => {
    const history = [{ id: 2, actor: 'admin' }];
    const { useCases, calls } = fakeDatabase(() => history);
    assert.deepEqual(await useCases.listSettingsHistory.list('admin'), history);
    assert.deepEqual(calls.map((c) => [c.name, c.args.action]), [['orbit_settings', 'history']]);
  });

  it('Then a viewer is refused and the database is not touched', async () => {
    const { useCases, calls } = fakeDatabase(() => []);
    await assert.rejects(useCases.listSettingsHistory.list('viewer'), (e: unknown) => e instanceof SettingsAccessDeniedError && e.message === '관리자만 설정 이력을 볼 수 있습니다.');
    assert.equal(calls.length, 0);
  });

  it('Then a missing settings function is a setup error', async () => {
    const { useCases } = fakeDatabase(() => new OrbitFunctionError('x', '42883'));
    await assert.rejects(useCases.listSettingsHistory.list('admin'), SettingsMigrationRequiredError);
  });
});
