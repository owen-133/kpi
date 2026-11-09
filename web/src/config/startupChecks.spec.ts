import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startupProblems } from './startupChecks.ts';

describe('startup checks (legacy server.js:5-12)', () => {
  it('accepts a development environment with nothing configured', () => {
    assert.deepEqual(startupProblems({}), []);
  });
  it('refuses production without both passwords', () => {
    assert.deepEqual(startupProblems({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x', ADMIN_PASSWORD: 'a' }), ['배포 시 관리자와 조회 비밀번호가 필요합니다.']);
  });
  it('refuses a cloud database (DATABASE_URL) without both passwords even outside production', () => {
    assert.deepEqual(startupProblems({ DATABASE_URL: 'postgres://x' }), ['배포 시 관리자와 조회 비밀번호가 필요합니다.']);
  });
  it('refuses equal passwords', () => {
    assert.deepEqual(startupProblems({ ADMIN_PASSWORD: 'same', VIEWER_PASSWORD: 'same' }), ['관리자와 조회 비밀번호는 달라야 합니다.']);
  });
  it('refuses production without DATABASE_URL', () => {
    assert.deepEqual(startupProblems({ NODE_ENV: 'production', ADMIN_PASSWORD: 'a', VIEWER_PASSWORD: 'b' }), ['운영 배포에는 DATABASE_URL이 필요합니다.']);
  });
  it('accepts a complete production environment', () => {
    assert.deepEqual(startupProblems({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x', ADMIN_PASSWORD: 'a', VIEWER_PASSWORD: 'b' }), []);
  });
  const production = { NODE_ENV: 'production', ADMIN_PASSWORD: 'a', VIEWER_PASSWORD: 'b' };
  it('accepts a production DATABASE_URL that can be verified over TLS, with or without a CA', () => {
    assert.deepEqual(startupProblems({ ...production, DATABASE_URL: 'postgres://u:p@db.example:5432/postgres?sslmode=require' }), []);
    assert.deepEqual(startupProblems({ ...production, DATABASE_URL: 'postgres://u:p@db.example:5432/postgres', DATABASE_CA: 'PEM' }), []);
  });
  it('refuses a production DATABASE_URL that turns TLS verification off, in any letter case, naming the cause and no secret', () => {
    for (const bad of ['sslmode=disable', 'sslmode=DISABLE', 'sslmode=Prefer', 'sslmode=NO-VERIFY', 'ssl=false', 'ssl=FALSE', 'ssl=0']) {
      const problems = startupProblems({ ...production, DATABASE_URL: `postgres://u:topsecret@db.example/postgres?${bad}` });
      assert.equal(problems.length, 1, bad);
      assert.match(problems[0] ?? '', /^운영 DB 연결은 검증된 TLS가 필요합니다: /, bad);
      assert.doesNotMatch(problems[0] ?? '', /topsecret/, bad);
    }
  });
  it('refuses a production DATABASE_URL that is not a postgres URL', () => {
    assert.equal(startupProblems({ ...production, DATABASE_URL: 'not a url' }).length, 1);
    assert.equal(startupProblems({ ...production, DATABASE_URL: 'mysql://u:p@h/db' }).length, 1);
  });
  it('leaves the TLS policy to the first database use outside production', () => {
    assert.deepEqual(startupProblems({ ADMIN_PASSWORD: 'a', VIEWER_PASSWORD: 'b', DATABASE_URL: 'postgres://u:p@localhost/db?sslmode=disable' }), []);
  });
});
