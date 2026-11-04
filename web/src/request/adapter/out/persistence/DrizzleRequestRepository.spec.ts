// R-014
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { Request } from '../../../domain/Request.ts';
import { createRequestId } from '../../../domain/RequestId.ts';
import { REQUEST_STATUSES } from '../../../domain/RequestStatus.ts';
import { DrizzleRequestRepository } from './DrizzleRequestRepository.ts';

const MIGRATIONS_FOLDER = path.resolve(import.meta.dirname, '..', '..', '..', '..', '..', 'drizzle');

async function givenMigratedDatabase() {
  const database = drizzle(new PGlite());
  await migrate(database, { migrationsFolder: MIGRATIONS_FOLDER });
  return { database, repository: new DrizzleRequestRepository(database) };
}

function registered(repository: DrizzleRequestRepository, title = '복합기 수리'): Request {
  return Request.register({
    id: repository.nextId(),
    title,
    requester: '김총무',
    occurredAt: new Date('2026-11-01T09:00:00.000Z'),
  });
}

async function rejectionText(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? ` ${error.cause.message}` : '';
    return `${error instanceof Error ? error.message : String(error)}${cause}`;
  }
  assert.fail('expected the statement to be rejected');
}

describe('DrizzleRequestRepository on in-memory PGlite with the real migrations', () => {
  it('seeds the status lookup table with the domain statuses', async () => {
    const { database } = await givenMigratedDatabase();
    const result = await database.execute(sql`select code from request_statuses order by code`);
    const codes = result.rows.map((row) => row.code);
    assert.deepEqual(codes, [...REQUEST_STATUSES].sort());
  });

  it('round-trips a request with status changes and memos to the same snapshot', async () => {
    const { repository } = await givenMigratedDatabase();
    const request = registered(repository);
    request.changeStatus('inProgress', undefined, new Date('2026-11-01T10:00:00.000Z'));
    request.addMemo('부품 주문함');
    request.changeStatus('done', '수리 완료', new Date('2026-11-02T10:00:00.000Z'));
    request.addMemo('영수증 첨부');
    await repository.save(request);

    const found = await repository.findById(request.id);
    assert.notEqual(found, null);
    assert.deepEqual(found?.toSnapshot(), request.toSnapshot());
    assert.equal(found?.status, 'done');
  });

  it('saves again by appending only the new history and memo rows', async () => {
    const { database, repository } = await givenMigratedDatabase();
    const request = registered(repository);
    await repository.save(request);
    const stored = await repository.findById(request.id);
    assert.notEqual(stored, null);
    stored?.changeStatus('inProgress', undefined, new Date('2026-11-01T11:00:00.000Z'));
    stored?.addMemo('착수');
    await repository.save(stored as Request);
    await repository.save(stored as Request);

    const history = await database.execute(sql`select seq, status from request_history order by seq`);
    assert.deepEqual(history.rows, [
      { seq: 0, status: 'received' },
      { seq: 1, status: 'inProgress' },
    ]);
    const memos = await database.execute(sql`select count(*)::int as total from request_memos`);
    assert.deepEqual(memos.rows, [{ total: 1 }]);
  });

  it('lists requests in registration order and returns null for unknown ids', async () => {
    const { repository } = await givenMigratedDatabase();
    const first = registered(repository, '첫째');
    const second = Request.register({
      id: repository.nextId(),
      title: '둘째',
      requester: '이총무',
      occurredAt: new Date('2026-11-01T12:00:00.000Z'),
    });
    await repository.save(second);
    await repository.save(first);

    const titles = (await repository.findAll()).map((request) => request.toSnapshot().title);
    assert.deepEqual(titles, ['첫째', '둘째']);
    assert.equal(await repository.findById(repository.nextId()), null);
    assert.equal(await repository.findById(createRequestId('request-1')), null);
  });

  it('rejects UPDATE and DELETE on request_history through the trigger', async () => {
    const { database, repository } = await givenMigratedDatabase();
    const request = registered(repository);
    await repository.save(request);

    const updateText = await rejectionText(
      database.execute(sql`update request_history set status = 'done' where request_id = ${request.id}`),
    );
    assert.match(updateText, /append-only/);
    const deleteText = await rejectionText(
      database.execute(sql`delete from request_history where request_id = ${request.id}`),
    );
    assert.match(deleteText, /append-only/);
    const lookupText = await rejectionText(database.execute(sql`delete from request_statuses`));
    assert.match(lookupText, /append-only/);

    const stored = await repository.findById(request.id);
    assert.deepEqual(stored?.toSnapshot(), request.toSnapshot());
  });

  it('rolls the request row back when inserting history fails', async () => {
    const { database, repository } = await givenMigratedDatabase();
    await database.execute(sql`alter table request_history add constraint forced_failure check (false) not valid`);
    const request = registered(repository);

    const failure = await rejectionText(repository.save(request));
    assert.match(failure, /forced_failure/);

    const remaining = await database.execute(sql`select count(*)::int as total from requests`);
    assert.deepEqual(remaining.rows, [{ total: 0 }]);
    assert.equal(await repository.findById(request.id), null);
  });
});
