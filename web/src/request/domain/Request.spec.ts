// R-014
import test from "node:test";
import assert from "node:assert/strict";
import { Request } from './Request.ts';
import { InvalidRequestError } from './RequestError.ts';
import { createRequestId } from './RequestId.ts';

const requestId = createRequestId('request-1');
const registeredAt = new Date('2026-01-01T00:00:00Z');
const laterAt = new Date('2026-01-02T00:00:00Z');

function newRequest(): Request {
  return Request.register({ id: requestId, title: 'Fix printer', requester: 'Kim', occurredAt: registeredAt });
}

function finishedRequest(): Request {
  const request = newRequest();
  request.changeStatus('done', undefined, laterAt);
  request.pullEvents();
  return request;
}

test('register trims title and requester and starts as received', () => {
  const request = Request.register({ id: requestId, title: '  Fix printer ', requester: ' Kim ' });
  const snapshot = request.toSnapshot();
  assert.equal(snapshot.title, 'Fix printer');
  assert.equal(snapshot.requester, 'Kim');
  assert.equal(snapshot.status, 'received');
  assert.deepEqual(snapshot.memos, []);
});

test('register with an empty title throws', () => {
  assert.throws(() => Request.register({ id: requestId, title: '   ', requester: 'Kim' }), InvalidRequestError);
});

test('register with an empty requester throws', () => {
  assert.throws(() => Request.register({ id: requestId, title: 'Fix', requester: '' }), InvalidRequestError);
});

test('register with an empty id throws', () => {
  assert.throws(() => Request.register({ id: '' as never, title: 'Fix', requester: 'Kim' }));
});

test('register raises exactly one RequestRegistered event', () => {
  const events = newRequest().pullEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'RequestRegistered');
});

test('register records the first history entry', () => {
  const history = newRequest().history();
  assert.deepEqual(history, [{ status: 'received', reason: null, changedAt: registeredAt }]);
});

test('changeStatus moves the status, records history and raises an event', () => {
  const request = newRequest();
  request.pullEvents();
  request.changeStatus('inProgress', undefined, laterAt);
  assert.equal(request.status, 'inProgress');
  assert.equal(request.history().length, 2);
  const events = request.pullEvents();
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    type: 'RequestStatusChanged',
    requestId,
    fromStatus: 'received',
    toStatus: 'inProgress',
    reason: null,
    occurredAt: laterAt,
  });
});

test('changeStatus to the same status throws and changes nothing', () => {
  const request = newRequest();
  request.pullEvents();
  assert.throws(() => request.changeStatus('received'), InvalidRequestError);
  assert.equal(request.history().length, 1);
  assert.equal(request.pullEvents().length, 0);
});

test('changeStatus to an unknown status throws', () => {
  assert.throws(() => newRequest().changeStatus('archived' as never), InvalidRequestError);
});

test('finishing a request does not need a reason', () => {
  const request = newRequest();
  request.changeStatus('rejected');
  assert.equal(request.status, 'rejected');
});

test('reopening a finished request without a reason throws and keeps it finished', () => {
  const request = finishedRequest();
  assert.throws(() => request.changeStatus('inProgress'), InvalidRequestError);
  assert.throws(() => request.changeStatus('received', '   '), InvalidRequestError);
  assert.equal(request.status, 'done');
  assert.equal(request.history().length, 2);
  assert.equal(request.pullEvents().length, 0);
});

test('reopening a finished request with a reason works and records the reason', () => {
  const request = finishedRequest();
  request.changeStatus('inProgress', ' printer broke again ', laterAt);
  assert.equal(request.status, 'inProgress');
  const lastEntry = request.history()[2];
  assert.equal(lastEntry.reason, 'printer broke again');
  const events = request.pullEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'RequestStatusChanged');
});

test('moving between finished statuses does not need a reason', () => {
  const request = finishedRequest();
  request.changeStatus('rejected');
  assert.equal(request.status, 'rejected');
});

test('addMemo stores the trimmed memo and raises an event', () => {
  const request = newRequest();
  request.pullEvents();
  request.addMemo('  called vendor ');
  assert.deepEqual(request.toSnapshot().memos, ['called vendor']);
  assert.equal(request.pullEvents()[0].type, 'RequestMemoAdded');
});

test('addMemo with an empty memo throws', () => {
  const request = newRequest();
  assert.throws(() => request.addMemo('  '), InvalidRequestError);
  assert.deepEqual(request.toSnapshot().memos, []);
});

test('pullEvents returns events once; a second pull is empty', () => {
  const request = newRequest();
  request.changeStatus('inProgress');
  assert.equal(request.pullEvents().length, 2);
  assert.equal(request.pullEvents().length, 0);
});

test('history returns a copy; editing it does not change the aggregate', () => {
  const request = newRequest();
  const copy = request.history() as unknown as { status: string }[];
  copy.push({ status: 'done' });
  copy[0] = { status: 'done' };
  assert.equal(request.history().length, 1);
  assert.equal(request.history()[0].status, 'received');
});

test('toSnapshot returns copies; editing them does not change the aggregate', () => {
  const request = newRequest();
  request.addMemo('first');
  const snapshot = request.toSnapshot();
  (snapshot.memos as string[]).push('hacked');
  assert.deepEqual(request.toSnapshot().memos, ['first']);
});

test('restore rebuilds an equal aggregate with no pending events', () => {
  const request = finishedRequest();
  request.addMemo('note');
  const restored = Request.restore(request.toSnapshot());
  assert.deepEqual(restored.toSnapshot(), request.toSnapshot());
  assert.equal(restored.pullEvents().length, 0);
});

test('restored aggregate still enforces the reopen rule', () => {
  const restored = Request.restore(finishedRequest().toSnapshot());
  assert.throws(() => restored.changeStatus('inProgress'), InvalidRequestError);
});

test('restore rejects an unknown status', () => {
  const snapshot = { ...newRequest().toSnapshot(), status: 'archived' as never };
  assert.throws(() => Request.restore(snapshot), InvalidRequestError);
});

test('restore rejects an empty history', () => {
  const snapshot = { ...newRequest().toSnapshot(), history: [] };
  assert.throws(() => Request.restore(snapshot), InvalidRequestError);
});

test('restore rejects a history that disagrees with the status', () => {
  const snapshot = { ...newRequest().toSnapshot(), status: 'done' as const };
  assert.throws(() => Request.restore(snapshot), InvalidRequestError);
});

test('restore rejects an empty title', () => {
  const snapshot = { ...newRequest().toSnapshot(), title: '' };
  assert.throws(() => Request.restore(snapshot), InvalidRequestError);
});
