import { OrbitFunctionError } from '../../../shared/port/OrbitFunctions.ts';

export const KPI_MIGRATION_MESSAGE = 'KPI 기능 DB 초기화가 필요합니다. supabase/kpi.sql을 SQL Editor에서 실행하세요.';

// PostgreSQL answers 42883 (undefined_function) when public.orbit_kpi is not installed. The legacy store sees the same
// situation as PostgREST PGRST202 and raises KPI_MIGRATION_REQUIRED, which the task list and detail tolerate.
const UNDEFINED_FUNCTION = '42883';

export function isKpiMissing(error: unknown): boolean {
  return error instanceof OrbitFunctionError && error.code === UNDEFINED_FUNCTION;
}
