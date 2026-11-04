import test from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from '../../../../config/container.ts';
import { InvalidRequestError } from '../../../domain/RequestError.ts';
import {
  changeRequestStatusHandler,
  listRequestsHandler,
  registerRequestHandler,
} from './requestHandlers.ts';
import type { RequestUseCases } from './requestHandlers.ts';

async function givenRegisteredRequest(useCases: RequestUseCases): Promise<string> {
  const { id } = await registerRequestHandler(useCases, { title: '복합기 수리', requester: '김총무' });
  return id;
}

test('A staff member registers a request and sees it listed as received', async () => {
  const useCases = createContainer();
  const id = await givenRegisteredRequest(useCases);
  const requests = await listRequestsHandler(useCases);
  assert.deepEqual(requests, [{ id, title: '복합기 수리', requester: '김총무', status: 'received', memos: [] }]);
});

test('The status moves from received to inProgress to done and the list follows', async () => {
  const useCases = createContainer();
  const id = await givenRegisteredRequest(useCases);
  await changeRequestStatusHandler(useCases, { id, status: 'inProgress' });
  assert.equal((await listRequestsHandler(useCases))[0].status, 'inProgress');
  await changeRequestStatusHandler(useCases, { id, status: 'done' });
  assert.equal((await listRequestsHandler(useCases))[0].status, 'done');
});

test('Reopening a done request needs a reason, and the refused attempt leaves it done', async () => {
  const useCases = createContainer();
  const id = await givenRegisteredRequest(useCases);
  await changeRequestStatusHandler(useCases, { id, status: 'done' });
  await assert.rejects(changeRequestStatusHandler(useCases, { id, status: 'inProgress' }), InvalidRequestError);
  assert.equal((await listRequestsHandler(useCases))[0].status, 'done');
  await changeRequestStatusHandler(useCases, { id, status: 'inProgress', reason: '재고장 접수' });
  assert.equal((await listRequestsHandler(useCases))[0].status, 'inProgress');
});

test('Unknown status text and unknown ids are refused loudly', async () => {
  const useCases = createContainer();
  const id = await givenRegisteredRequest(useCases);
  await assert.rejects(changeRequestStatusHandler(useCases, { id, status: 'archived' }), /unknown status/);
  await assert.rejects(changeRequestStatusHandler(useCases, { id: 'missing', status: 'done' }), /request not found/);
});

test('Two containers keep separate data, and a blank title is refused', async () => {
  const first = createContainer();
  const second = createContainer();
  await givenRegisteredRequest(first);
  assert.equal((await listRequestsHandler(second)).length, 0);
  await assert.rejects(registerRequestHandler(first, { title: '  ', requester: '김총무' }), InvalidRequestError);
  assert.equal((await listRequestsHandler(first)).length, 1);
});
