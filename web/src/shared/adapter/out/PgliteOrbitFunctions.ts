// Development and test adapter: the SQL functions inside a fresh in-memory PGlite. It applies supabase/*.sql in the
// order of test/supabase.test.js and web/src/parity/legacyFetchStub.ts and calls as role service_role, like the legacy oracle.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { callStatement, translateError } from './orbitFunctionSql.ts';
import type { OrbitFunctionArguments, OrbitFunctionName, OrbitFunctions } from '../../port/OrbitFunctions.ts';

// web/src/shared/adapter/out -> repository root/supabase (the files are read at run time, never bundled)
const SUPABASE_DIRECTORY = /* turbopackIgnore: true */ join(import.meta.dirname, '..', '..', '..', '..', '..', 'supabase');
const SCHEMA_FILES = ['schema', 'settings', 'deletion', 'kpi', 'upgrade'] as const;

export class PgliteOrbitFunctions implements OrbitFunctions {
  private readonly client: PGlite;
  private readonly database: ReturnType<typeof drizzle>;

  private constructor(client: PGlite) {
    this.client = client;
    this.database = drizzle(client);
  }

  static async create(): Promise<PgliteOrbitFunctions> {
    const client = new PGlite();
    await client.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
    for (const file of SCHEMA_FILES) {
      await client.exec(readFileSync(/* turbopackIgnore: true */ join(SUPABASE_DIRECTORY, `${file}.sql`), 'utf8'));
    }
    await client.exec('SET ROLE service_role');
    return new PgliteOrbitFunctions(client);
  }

  async call(name: OrbitFunctionName, args: OrbitFunctionArguments): Promise<unknown> {
    try {
      const result = await this.database.execute(callStatement(name, args));
      return (result.rows[0] as { data: unknown }).data;
    } catch (error) {
      throw translateError(error);
    }
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
