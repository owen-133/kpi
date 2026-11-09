import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tlsOptionsFor } from './databaseSecurity.ts';

/** The production database: postgres-js over verified TLS. `prepare: false` keeps it usable behind a transaction pooler. */
export function createDatabase(databaseUrl: string | undefined, certificateAuthority: string | undefined) {
  const ssl = tlsOptionsFor(databaseUrl, certificateAuthority);
  return drizzle(postgres(databaseUrl as string, { prepare: false, ssl, max: 5 }));
}
