import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { ORBIT_FUNCTION_NAMES, OrbitFunctionError } from '../../port/OrbitFunctions.ts';
import type { OrbitFunctionArguments, OrbitFunctionName } from '../../port/OrbitFunctions.ts';

/** `select public.<fn>($action, $payload::jsonb) as data`; the function name comes from a closed list, values are bound. */
export function callStatement(name: OrbitFunctionName, args: OrbitFunctionArguments): SQL {
  if (!ORBIT_FUNCTION_NAMES.includes(name)) throw new Error(`unknown database function '${String(name)}'`);
  const payload = JSON.stringify(args.payload ?? {});
  if (name === 'orbit_edit_task') return sql`select public.orbit_edit_task(${payload}::jsonb) as data`;
  const action = args.action;
  if (action === undefined) throw new Error(`${name} needs an action`);
  switch (name) {
    case 'orbit_api':
      return sql`select public.orbit_api(${action}, ${payload}::jsonb) as data`;
    case 'orbit_lifecycle':
      return sql`select public.orbit_lifecycle(${action}, ${payload}::jsonb) as data`;
    case 'orbit_settings':
      return sql`select public.orbit_settings(${action}, ${payload}::jsonb) as data`;
    case 'orbit_kpi':
      return sql`select public.orbit_kpi(${action}, ${payload}::jsonb) as data`;
  }
}

/** Unwraps drizzle's query error and turns a database exception into an OrbitFunctionError; anything else is rethrown. */
export function translateError(error: unknown): unknown {
  const original = (error as { cause?: unknown } | null)?.cause ?? error;
  const candidate = original as { message?: unknown; code?: unknown; severity?: unknown } | null;
  if (candidate !== null && typeof candidate === 'object' && typeof candidate.message === 'string' && typeof candidate.code === 'string') {
    return new OrbitFunctionError(candidate.message, candidate.code);
  }
  return error;
}
