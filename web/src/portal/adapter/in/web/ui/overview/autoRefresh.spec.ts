import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AUTO_REFRESH_MS,
  IDLE_LIMIT_MS,
  SYNC_FAILED_TEXT,
  createAutoRefresh,
  nextTickDelay,
  shouldSkip,
  type AutoRefreshDeps,
  type RefreshGate,
} from './autoRefresh.ts';

const open: RefreshGate = { onOverview: true, hidden: false, idleMs: 0, dialogOpen: false };

test('the timing constants are the legacy ones: every 30 seconds, quiet after 300 seconds without input', () => {
  assert.equal(AUTO_REFRESH_MS, 30000);
  assert.equal(IDLE_LIMIT_MS, 300000);
  assert.equal(SYNC_FAILED_TEXT, '자동 갱신 실패 · 새로고침으로 다시 확인하세요.');
});

test('a visible, active Overview with no dialog is refreshed', () => {
  assert.equal(shouldSkip(open), false);
});

for (const [name, gate] of [
  ['another screen is shown', { ...open, onOverview: false }],
  ['the tab is hidden', { ...open, hidden: true }],
  ['a dialog is open', { ...open, dialogOpen: true }],
  ['no input for more than 300 seconds', { ...open, idleMs: IDLE_LIMIT_MS + 1 }],
] as const) {
  test(`the refresh is skipped when ${name}`, () => assert.equal(shouldSkip(gate), true));
}

test('the idle limit is a strict greater-than: exactly 300 seconds still refreshes', () => {
  assert.equal(shouldSkip({ ...open, idleMs: IDLE_LIMIT_MS }), false);
  assert.equal(shouldSkip({ ...open, idleMs: IDLE_LIMIT_MS + 1 }), true);
});

test('ticks stay on the 30 second grid of the page start, whenever a screen mounts', () => {
  assert.equal(nextTickDelay(1000, 1000), 30000, 'right on the grid waits a whole period');
  assert.equal(nextTickDelay(1000, 13000), 18000);
  assert.equal(nextTickDelay(1000, 30999), 1);
  assert.equal(nextTickDelay(1000, 31000), 30000);
  assert.equal(nextTickDelay(1000, 91000), 30000);
});

type Fresh = readonly string[];
function rig(over: Partial<AutoRefreshDeps<Fresh>> = {}) {
  const calls: string[] = [];
  const deps: AutoRefreshDeps<Fresh> = {
    gate: () => open,
    fetchTasks: async () => {
      calls.push('fetch');
      return ['fresh'];
    },
    stillCurrent: () => true,
    apply: (fresh) => calls.push('apply:' + fresh.join(',')),
    fail: () => calls.push('fail'),
    ...over,
  };
  return { calls, tick: createAutoRefresh(deps) };
}

test('given an open Overview, a tick fetches, applies the fresh tasks and does not mark a failure', async () => {
  const { calls, tick } = rig();
  assert.equal(await tick(), 'applied');
  assert.deepEqual(calls, ['fetch', 'apply:fresh']);
});

test('given a skip condition, a tick fetches nothing and applies nothing', async () => {
  const { calls, tick } = rig({ gate: () => ({ ...open, dialogOpen: true }) });
  assert.equal(await tick(), 'skipped');
  assert.deepEqual(calls, []);
});

test('given the view changed or a dialog opened while the fetch was running, the answer is dropped without a failure mark', async () => {
  const { calls, tick } = rig({ stillCurrent: () => false });
  assert.equal(await tick(), 'dropped');
  assert.deepEqual(calls, ['fetch']);
});

test('given the fetch fails, the status line is marked and nothing is applied', async () => {
  const { calls, tick } = rig({ fetchTasks: async () => Promise.reject(new Error('down')) });
  assert.equal(await tick(), 'failed');
  assert.deepEqual(calls, ['fail']);
});

test('given applying throws, the failure mark is written like a failed fetch', async () => {
  const { calls, tick } = rig({
    apply: () => {
      throw new Error('render');
    },
  });
  assert.equal(await tick(), 'failed');
  assert.deepEqual(calls, ['fetch', 'fail']);
});

test('a tick while another one is still fetching does nothing; the next one after it ended works again', async () => {
  let release: () => void = () => {};
  const calls: string[] = [];
  const tick = createAutoRefresh<Fresh>({
    gate: () => open,
    fetchTasks: () =>
      new Promise((resolve) => {
        calls.push('fetch');
        release = () => resolve(['x']);
      }),
    stillCurrent: () => true,
    apply: () => calls.push('apply'),
    fail: () => calls.push('fail'),
  });
  const first = tick();
  assert.equal(await tick(), 'skipped', 'refreshing flag set');
  assert.deepEqual(calls, ['fetch']);
  release();
  assert.equal(await first, 'applied');
  const third = tick();
  release();
  assert.equal(await third, 'applied');
  assert.deepEqual(calls, ['fetch', 'apply', 'fetch', 'apply']);
});

test('the refreshing flag is cleared after a failure too', async () => {
  let fail = true;
  const calls: string[] = [];
  const tick = createAutoRefresh<Fresh>({
    gate: () => open,
    fetchTasks: async () => (fail ? Promise.reject(new Error('x')) : ['ok']),
    stillCurrent: () => true,
    apply: () => calls.push('apply'),
    fail: () => calls.push('fail'),
  });
  assert.equal(await tick(), 'failed');
  fail = false;
  assert.equal(await tick(), 'applied');
  assert.deepEqual(calls, ['fail', 'apply']);
});
