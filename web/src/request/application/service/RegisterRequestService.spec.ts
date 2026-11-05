// R-014
import test from "node:test";
import assert from "node:assert/strict";
import { InvalidRequestError } from '../../domain/RequestError.ts';
import { InMemoryRequestRepository, RecordingEventPublisher } from './inMemoryFakes.ts';
import { RegisterRequestService } from './RegisterRequestService.ts';

function setUp() {
  const repository = new InMemoryRequestRepository();
  const publisher = new RecordingEventPublisher();
  return { repository, publisher, service: new RegisterRequestService(repository, publisher) };
}

test('Given a valid command, When register, Then the request is saved as received and its id returned', async () => {
  const { repository, service } = setUp();
  const id = await service.register({ title: 'Fix printer', requester: 'Kim' });
  const saved = await repository.findById(id);
  assert.notEqual(saved, null);
  assert.equal(saved?.toSnapshot().status, 'received');
  assert.equal(saved?.toSnapshot().title, 'Fix printer');
});

test('Given a valid command, When register, Then exactly one RequestRegistered event is published', async () => {
  const { publisher, service } = setUp();
  await service.register({ title: 'Fix printer', requester: 'Kim' });
  assert.deepEqual(publisher.publishedEvents.map((event) => event.type), ['RequestRegistered']);
});

test('Given two commands, When register twice, Then ids differ and each publishes its own event', async () => {
  const { publisher, service } = setUp();
  const firstId = await service.register({ title: 'A', requester: 'Kim' });
  const secondId = await service.register({ title: 'B', requester: 'Lee' });
  assert.notEqual(firstId, secondId);
  assert.equal(publisher.publishedEvents.length, 2);
});

test('Given an empty title, When register, Then it throws and nothing is saved or published', async () => {
  const { repository, publisher, service } = setUp();
  await assert.rejects(service.register({ title: '  ', requester: 'Kim' }), InvalidRequestError);
  assert.equal(repository.saveCount, 0);
  assert.equal(publisher.publishedEvents.length, 0);
});
