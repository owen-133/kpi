import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * Opens the Postgres connection used at runtime. `prepare: false` lets it work behind
 * Supabase's transaction pooler. Throws when DATABASE_URL is missing.
 */
export function createDatabase(databaseUrl: string | undefined) {
  if (databaseUrl === undefined || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL is required when PERSISTENCE=postgres');
  }
  return drizzle(postgres(databaseUrl, { prepare: false }));
}
