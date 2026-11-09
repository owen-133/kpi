import 'server-only';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { callStatement, translateError } from './orbitFunctionSql.ts';
import type { OrbitFunctionArguments, OrbitFunctionName, OrbitFunctions } from '../../port/OrbitFunctions.ts';

/** Production adapter: drizzle over postgres-js, parameterized `select public.<fn>(...)` calls only. */
export class PostgresOrbitFunctions implements OrbitFunctions {
  private readonly database: PostgresJsDatabase;

  constructor(database: PostgresJsDatabase) {
    this.database = database;
  }

  async call(name: OrbitFunctionName, args: OrbitFunctionArguments): Promise<unknown> {
    try {
      const rows = await this.database.execute(callStatement(name, args));
      return (rows[0] as { data: unknown }).data;
    } catch (error) {
      throw translateError(error);
    }
  }
}
