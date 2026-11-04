import test from "node:test";
import assert from "node:assert/strict";
import { InvalidRequestError } from '../../domain/RequestError.ts';
import { createRequestId } from '../../domain/RequestId.ts';
import { RequestNotFoundError } from '../RequestNotFoundError.ts';
import { ChangeRequestStatusService } from './ChangeRequestStatusService.ts';
import { RegisterRequestService } from './RegisterRequestService.ts';
import { InMemoryRequestRepository, RecordingEventPublisher } from './inMemoryFakes.ts';

async function givenRegisteredRequest() {
  const repository = new InMemoryRequestRepository();
  const publisher = new RecordingEventPublisher();
  const id = await new RegisterRequestService(repository, publisher).register({ title: 'Fix printer', requester: 'Kim' });
  publisher.publishedEvents.length = 0;
  repository.saveCount = 0;
  return { repository, publisher, id, service: new ChangeRequestStatusService(repository, publisher) };
}

test('Given a received request, When status changes to inProgress, Then it is saved and one event is published', async () => {
  const { repository, publisher, id, service } = await givenRegisteredRequest();
  await service.changeStatus({ id, status: 'inProgress' });
  assert.equal((await repository.findById(id))?.status, 'inProgress');
  assert.equal(repository.saveCount, 1);
  assert.deepEqual(publisher.publishedEvents.map((event) => event.type), ['RequestStatusChanged']);
});

test('Given an unknown id, When status changes, Then it throws RequestNotFoundError and publishes nothing', async () => {
  const { repository, publisher, service } = await givenRegisteredRequest();
  await assert.rejects(
    service.changeStatus({ id: createRequestId('missing'), status: 'done' }),
    RequestNotFoundError,
  );
  assert.equal(repository.saveCount, 0);
  assert.equal(publisher.publishedEvents.length, 0);
});

test('Given a done request, When reopened without a reason, Then it throws and stays done', async () => {
  const { repository, publisher, id, service } = await givenRegisteredRequest();
  await service.changeStatus({ id, status: 'done' });
  publisher.publishedEvents.length = 0;
  repository.saveCount = 0;
  await assert.rejects(service.changeStatus({ id, status: 'inProgress' }), InvalidRequestError);
  assert.equal((await repository.findById(id))?.status, 'done');
  assert.equal(repository.saveCount, 0);
  assert.equal(publisher.publishedEvents.length, 0);
});

test('Given a done request, When reopened with a reason, Then it is inProgress and the reason is in the event', async () => {
  const { publisher, repository, id, service } = await givenRegisteredRequest();
  await service.changeStatus({ id, status: 'done' });
  publisher.publishedEvents.length = 0;
  await service.changeStatus({ id, status: 'inProgress', reason: 'broke again' });
  assert.equal((await repository.findById(id))?.status, 'inProgress');
  const event = publisher.publishedEvents[0];
  assert.equal(event.type === 'RequestStatusChanged' ? event.reason : null, 'broke again');
});

test('Given a received request, When changed to the same status, Then it throws', async () => {
  const { id, service } = await givenRegisteredRequest();
  await assert.rejects(service.changeStatus({ id, status: 'received' }), InvalidRequestError);
});

test('Given two consecutive changes, When both run, Then each event is published once (no double events)', async () => {
  const { publisher, id, service } = await givenRegisteredRequest();
  await service.changeStatus({ id, status: 'inProgress' });
  await service.changeStatus({ id, status: 'done' });
  assert.equal(publisher.publishedEvents.length, 2);
});
