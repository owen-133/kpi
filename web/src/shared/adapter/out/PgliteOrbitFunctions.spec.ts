import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PgliteOrbitFunctions } from './PgliteOrbitFunctions.ts';
import { OrbitFunctionError } from '../../port/OrbitFunctions.ts';

describe('PgliteOrbitFunctions', () => {
  it('calls orbit_api against the real schema and returns the json result', async () => {
    const orbit = await PgliteOrbitFunctions.create();
    assert.deepEqual(await orbit.call('orbit_api', { action: 'list', payload: {} }), []);
    const created = (await orbit.call('orbit_api', {
      action: 'create',
      payload: { title: '시험', requester: '홍', requested_at: '2026-11-03T01:00:00Z' },
    })) as { id: string };
    assert.match(created.id, /^[0-9a-f-]{36}$/);
    const listed = (await orbit.call('orbit_api', { action: 'list', payload: {} })) as unknown[];
    assert.equal(listed.length, 1);
    await orbit.close();
  });
  it('carries the raise-exception text and sqlstate exactly (PostgREST message and code)', async () => {
    const orbit = await PgliteOrbitFunctions.create();
    await assert.rejects(
      orbit.call('orbit_api', { action: 'create', payload: { requester: 'a', requested_at: '2026-11-03T01:00:00Z' } }),
      (error: unknown) => error instanceof OrbitFunctionError && error.code === 'PT400' && error.message === '제목, 요청자, 요청 시각이 필요합니다.',
    );
    await orbit.close();
  });
  it('passes the payload as a bound parameter, never as SQL text', async () => {
    const orbit = await PgliteOrbitFunctions.create();
    const hostile = "x'); drop table orbit_private.events; --";
    await orbit.call('orbit_api', { action: 'create', payload: { title: hostile, requester: 'a', requested_at: '2026-11-03T01:00:00Z' } });
    const listed = (await orbit.call('orbit_api', { action: 'list', payload: {} })) as Array<{ title: string }>;
    assert.equal(listed[0].title, hostile);
    await orbit.close();
  });
});
