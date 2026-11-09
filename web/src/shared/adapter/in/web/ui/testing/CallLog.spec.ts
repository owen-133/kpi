import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CallLog } from './CallLog.ts';

test('calls are kept in order with their arguments', () => {
  const log = new CallLog();
  log.record('a', [1]);
  log.record('b', []);
  log.record('a', [2, 3]);
  assert.deepEqual(log.names(), ['a', 'b', 'a']);
  assert.deepEqual(log.argsOf('a'), [[1], [2, 3]]);
});

test('a queued failure fires once for that method only, after the call is logged', () => {
  const log = new CallLog();
  log.failNext('save', '충돌');
  log.record('other', []);
  assert.throws(() => log.record('save', ['x']), { message: '충돌' });
  assert.doesNotThrow(() => log.record('save', ['y']));
  assert.deepEqual(log.argsOf('save'), [['x'], ['y']]);
});

test('failures of one method fire in the order they were queued', () => {
  const log = new CallLog();
  log.failNext('m', 'first');
  log.failNext('m', 'second');
  assert.throws(() => log.record('m', []), { message: 'first' });
  assert.throws(() => log.record('m', []), { message: 'second' });
  assert.doesNotThrow(() => log.record('m', []));
});
