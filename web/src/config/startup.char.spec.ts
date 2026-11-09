// R-010 in the operator's words: a deployment that lacks its settings refuses to start.
// untested: a database that cannot be reached answering 503 instead of falling back to a local store. The Postgres adapter
// imports `server-only`, which only loads inside a Next build; the fallback absence is a code reading of config/container.ts.
// The legacy portal named the cloud store STORAGE_BACKEND=supabase; the Next app names it DATABASE_URL.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from './container.ts';
import { startupProblems } from './startupChecks.ts';

const BOTH = { ADMIN_PASSWORD: 'a-secret', VIEWER_PASSWORD: 'v-secret' };

describe('R-010 a deployment without its settings does not start', () => {
  // R-010
  it('production without a database address refuses to start, with the passwords given or not', () => {
    assert.throws(() => createContainer({ NODE_ENV: 'production', ...BOTH }), /DATABASE_URL/);
    assert.throws(() => createContainer({ NODE_ENV: 'production' }), /DATABASE_URL|비밀번호/);
    assert.deepEqual(startupProblems({ NODE_ENV: 'production', ...BOTH }), ['운영 배포에는 DATABASE_URL이 필요합니다.']);
  });
  // R-010
  it('production or a cloud database without both passwords refuses to start, whichever one is missing or empty', () => {
    const cloud = { NODE_ENV: 'production', DATABASE_URL: 'postgres://u:p@db.example/x' };
    for (const env of [{ ...cloud }, { ...cloud, ADMIN_PASSWORD: 'a' }, { ...cloud, VIEWER_PASSWORD: 'v' }, { ...cloud, ADMIN_PASSWORD: '', VIEWER_PASSWORD: 'v' }]) {
      assert.deepEqual(startupProblems(env), ['배포 시 관리자와 조회 비밀번호가 필요합니다.'], JSON.stringify(env));
      assert.throws(() => createContainer(env), /비밀번호/, JSON.stringify(env));
    }
    assert.deepEqual(startupProblems({ DATABASE_URL: 'postgres://x' }), ['배포 시 관리자와 조회 비밀번호가 필요합니다.']);
  });
  // R-010
  it('the same password for both accounts refuses to start', () => {
    assert.throws(() => createContainer({ ADMIN_PASSWORD: 'same', VIEWER_PASSWORD: 'same' }), /달라야/);
    assert.deepEqual(startupProblems({ ADMIN_PASSWORD: 'same', VIEWER_PASSWORD: 'same' }), ['관리자와 조회 비밀번호는 달라야 합니다.']);
  });
  // R-010 (the pair: what is allowed to start)
  it('a complete production environment and a bare development one both start', async () => {
    assert.deepEqual(startupProblems({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x', ...BOTH }), []);
    assert.deepEqual(startupProblems({}), []);
    const dev = createContainer({}, { log: () => {} });
    await dev.stop();
  });
});
