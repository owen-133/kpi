import { integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Lookup table: the allowed status codes. Rows are seeded by the custom migration, and a
// before update or delete trigger keeps them fixed.
export const requestStatuses = pgTable('request_statuses', {
  code: text('code').primaryKey(),
});

// Facts of the Request itself. The current status and the registration time are not stored:
// they are the last and the first row of request_history.
export const requests = pgTable('requests', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  requester: text('requester').notNull(),
});

// Append-only: a before update or delete trigger in the custom migration rejects changes.
// One row per status change, seq starts at 0.
export const requestHistory = pgTable(
  'request_history',
  {
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id),
    seq: integer('seq').notNull(),
    status: text('status')
      .notNull()
      .references(() => requestStatuses.code),
    reason: text('reason'),
    changedAt: timestamp('changed_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.requestId, table.seq] })],
);

// One row per memo, in the order they were added.
export const requestMemos = pgTable(
  'request_memos',
  {
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id),
    seq: integer('seq').notNull(),
    content: text('content').notNull(),
  },
  (table) => [primaryKey({ columns: [table.requestId, table.seq] })],
);
