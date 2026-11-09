import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from './container.ts';

describe('container', () => {
  it('exposes only the guard pipeline, the lazy database opener and stop', () => {
    const container = createContainer({});
    assert.deepEqual(Object.keys(container).sort(), ['orbitFunctions', 'pipeline', 'stop']);
  });

  it('refuses production without DATABASE_URL', () => {
    assert.throws(() => createContainer({ NODE_ENV: 'production', ADMIN_PASSWORD: 'a', VIEWER_PASSWORD: 'b' }), /DATABASE_URL/);
  });
});
