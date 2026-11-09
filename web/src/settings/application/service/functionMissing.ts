import { OrbitFunctionError } from '../../../shared/port/OrbitFunctions.ts';

/** PostgREST answers PGRST202 for an unknown function, Postgres itself 42883 (undefined_function). */
export function isFunctionMissing(error: unknown): boolean {
  return error instanceof OrbitFunctionError && (error.code === 'PGRST202' || error.code === '42883');
}
