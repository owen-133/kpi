import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tlsOptionsFor } from './databaseSecurity.ts';

describe('database TLS policy', () => {
  it('requires certificate verification and passes an optional CA', () => {
    assert.deepEqual(tlsOptionsFor('postgres://u:p@db.example:5432/postgres', undefined), { rejectUnauthorized: true });
    assert.deepEqual(tlsOptionsFor('postgres://u:p@db.example:5432/postgres', 'PEM'), { rejectUnauthorized: true, ca: 'PEM' });
  });
  it('refuses URLs that would send the password in plaintext', () => {
    for (const bad of ['sslmode=disable', 'sslmode=allow', 'sslmode=prefer', 'ssl=false', 'ssl=0', 'sslmode=no-verify', 'sslmode=DISABLE', 'sslmode=Prefer', 'ssl=FALSE']) {
      assert.throws(() => tlsOptionsFor(`postgres://u:p@db.example/postgres?${bad}`, undefined), /plaintext|TLS/, bad);
    }
  });
  it('refuses a missing or malformed URL', () => {
    assert.throws(() => tlsOptionsFor(undefined, undefined), /DATABASE_URL/);
    assert.throws(() => tlsOptionsFor('not a url', undefined), /DATABASE_URL/);
    assert.throws(() => tlsOptionsFor('mysql://u:p@h/db', undefined), /postgres/);
  });
});
