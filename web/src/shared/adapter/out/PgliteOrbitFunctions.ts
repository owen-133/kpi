// Development and test adapter: the SQL functions inside a fresh in-memory PGlite. It applies supabase/*.sql in the
// order of test/supabase.test.js and web/src/parity/legacyFetchStub.ts and calls as role service_role, like the legacy oracle.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { callStatement, translateError } from './orbitFunctionSql.ts';
import type { OrbitFunctionArguments, OrbitFunctionName, OrbitFunctions } from '../../port/OrbitFunctions.ts';

// The SQL files sit at <repository root>/supabase and are read at run time, never bundled. Inside a Next build
// import.meta.dirname is undefined and import.meta.url points into the build output, so the search starts from the
// working directory (the server runs in web/) and uses the source location only when it is defined.
function findSupabaseDirectory(): string {
  const candidates = [
    process.env.ORBIT_SUPABASE_DIRECTORY,
    /* turbopackIgnore: true */ join(process.cwd(), '..', 'supabase'),
    /* turbopackIgnore: true */ join(process.cwd(), 'supabase'),
    import.meta.dirname === undefined ? undefined : join(import.meta.dirname, '..', '..', '..', '..', '..', 'supabase'),
  ];
  const found = candidates.find((directory) => directory !== undefined && existsSync(join(directory, 'schema.sql')));
  if (found === undefined) throw new Error('supabase/schema.sql not found (set ORBIT_SUPABASE_DIRECTORY)');
  return found;
}
const SUPABASE_DIRECTORY = findSupabaseDirectory();
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
