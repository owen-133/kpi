import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIALOG_NAMES, initialShellState, shellReducer, VIEWS, type ShellState } from './shellState.ts';

const start = (): ShellState => initialShellState();

test('the shell starts on Overview with nothing rendered, nothing open and no failed sync', () => {
  const s = start();
  assert.equal(s.view, 'overview');
  assert.equal(s.renderTick, 0);
  assert.equal(s.reportMonth, null);
  assert.equal(s.lastRefreshed, '');
  assert.equal(s.syncFailed, false);
  assert.deepEqual(Object.keys(s.dialogs), ['create', 'improvement', 'trash', 'settings', 'edit', 'detail']);
  for (const name of DIALOG_NAMES) assert.deepEqual(s.dialogs[name], { open: false, tick: 0 });
  assert.deepEqual([...VIEWS], ['overview', 'board', 'report', 'improvements']);
});

test('navigate changes the view and always counts as a render, like the legacy click handler calling render()', () => {
  const a = shellReducer(start(), { type: 'navigate', view: 'board' });
  assert.equal(a.view, 'board');
  assert.equal(a.renderTick, 1);
  const again = shellReducer(a, { type: 'navigate', view: 'board' });
  assert.equal(again.view, 'board');
  assert.equal(again.renderTick, 2, 'the same view is mounted anew');
});

test('rendered counts a render without touching the view, dialogs or month', () => {
  const s = shellReducer(shellReducer(start(), { type: 'reportMonth', month: '2026-10' }), { type: 'navigate', view: 'report' });
  const r = shellReducer(s, { type: 'rendered' });
  assert.equal(r.renderTick, s.renderTick + 1);
  assert.equal(r.view, 'report');
  assert.equal(r.reportMonth, '2026-10');
  assert.deepEqual(r.dialogs, s.dialogs);
});

test('refreshed only records the time: the render that follows a refresh is its own action', () => {
  const s = shellReducer(start(), { type: 'refreshed', at: '2026-11-09T03:00:00.000Z' });
  assert.equal(s.lastRefreshed, '2026-11-09T03:00:00.000Z');
  assert.equal(s.renderTick, 0);
});

test('syncFailed marks the status line and the next render clears it, because render() rebuilds the line', () => {
  const failed = shellReducer(start(), { type: 'syncFailed' });
  assert.equal(failed.syncFailed, true);
  assert.equal(failed.renderTick, 0, 'a failed refresh does not render');
  assert.equal(shellReducer(failed, { type: 'rendered' }).syncFailed, false);
  assert.equal(shellReducer(failed, { type: 'navigate', view: 'board' }).syncFailed, false);
});

test('reportMonth is kept across renders and navigation (legacy module variable)', () => {
  let s = shellReducer(start(), { type: 'reportMonth', month: '2026-09' });
  s = shellReducer(s, { type: 'navigate', view: 'board' });
  s = shellReducer(s, { type: 'rendered' });
  assert.equal(s.reportMonth, '2026-09');
});

test('open sets the slot, bumps its tick and carries the ids; other dialogs stay untouched', () => {
  const s = shellReducer(start(), { type: 'open', dialog: 'detail', taskId: 't1' });
  assert.deepEqual(s.dialogs.detail, { open: true, tick: 1, taskId: 't1' });
  assert.deepEqual(s.dialogs.create, { open: false, tick: 0 });
  const edit = shellReducer(s, { type: 'open', dialog: 'improvement', itemId: null });
  assert.deepEqual(edit.dialogs.improvement, { open: true, tick: 1, itemId: null });
  assert.equal(edit.renderTick, 0, 'opening a dialog is not a screen render');
});

test('opening an open dialog again remounts its body (new tick) and replaces its ids', () => {
  let s = shellReducer(start(), { type: 'open', dialog: 'detail', taskId: 't1' });
  s = shellReducer(s, { type: 'open', dialog: 'detail', taskId: 't2' });
  assert.deepEqual(s.dialogs.detail, { open: true, tick: 2, taskId: 't2' });
  s = shellReducer(s, { type: 'open', dialog: 'detail' });
  assert.deepEqual(s.dialogs.detail, { open: true, tick: 3 });
});

test('closed keeps the tick and ids, and closing a closed dialog returns the very same state', () => {
  const opened = shellReducer(start(), { type: 'open', dialog: 'trash' });
  const closed = shellReducer(opened, { type: 'closed', dialog: 'trash' });
  assert.deepEqual(closed.dialogs.trash, { open: false, tick: 1 });
  assert.equal(shellReducer(closed, { type: 'closed', dialog: 'trash' }), closed);
  assert.equal(shellReducer(start(), { type: 'closed', dialog: 'edit' }).dialogs.edit.open, false);
});

test('dialogs stack independently: edit over detail, detail over trash', () => {
  let s = shellReducer(start(), { type: 'open', dialog: 'trash' });
  s = shellReducer(s, { type: 'open', dialog: 'detail', taskId: 'x' });
  s = shellReducer(s, { type: 'open', dialog: 'edit', taskId: 'x' });
  s = shellReducer(s, { type: 'closed', dialog: 'edit' });
  assert.deepEqual([s.dialogs.trash.open, s.dialogs.detail.open, s.dialogs.edit.open], [true, true, false]);
});

test('the reducer does not mutate its input', () => {
  const s = start();
  const frozen = structuredClone(s);
  shellReducer(s, { type: 'open', dialog: 'create' });
  shellReducer(s, { type: 'navigate', view: 'report' });
  assert.deepEqual(s, frozen);
});
