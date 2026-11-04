import test from "node:test";
import assert from "node:assert/strict";
import { ChangeRequestStatusService } from './ChangeRequestStatusService.ts';
import { ListRequestsService } from './ListRequestsService.ts';
import { RegisterRequestService } from './RegisterRequestService.ts';
import { InMemoryRequestRepository, RecordingEventPublisher } from './inMemoryFakes.ts';

test('Given no requests, When list, Then it returns an empty array', async () => {
  const service = new ListRequestsService(new InMemoryRequestRepository());
  assert.deepEqual(await service.list(), []);
});

test('Given two requests, When list, Then each view carries id, title, requester, status and memos', async () => {
  const repository = new InMemoryRequestRepository();
  const publisher = new RecordingEventPublisher();
  const firstId = await new RegisterRequestService(repository, publisher).register({ title: 'A', requester: 'Kim' });
  await new RegisterRequestService(repository, publisher).register({ title: 'B', requester: 'Lee' });
  await new ChangeRequestStatusService(repository, publisher).changeStatus({ id: firstId, status: 'inProgress' });

  const views = await new ListRequestsService(repository).list();

  assert.equal(views.length, 2);
  assert.deepEqual(views[0], { id: firstId, title: 'A', requester: 'Kim', status: 'inProgress', memos: [] });
  assert.equal(views[1].status, 'received');
});

test('Given a listed view, When the caller mutates it, Then the stored request is unchanged', async () => {
  const repository = new InMemoryRequestRepository();
  const id = await new RegisterRequestService(repository, new RecordingEventPublisher()).register({ title: 'A', requester: 'Kim' });
  const [view] = await new ListRequestsService(repository).list();
  (view.memos as string[]).push('hacked');
  assert.deepEqual((await repository.findById(id))?.toSnapshot().memos, []);
});
