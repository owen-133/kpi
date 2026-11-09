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
});
