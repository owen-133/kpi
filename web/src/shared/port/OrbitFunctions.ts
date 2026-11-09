// Shared-kernel out-port: the only way application data is read or written. Every call goes to one of the
// existing SQL functions (supabase/*.sql); there is no table access.
export const ORBIT_FUNCTION_NAMES = ['orbit_api', 'orbit_lifecycle', 'orbit_settings', 'orbit_kpi', 'orbit_edit_task'] as const;
export type OrbitFunctionName = (typeof ORBIT_FUNCTION_NAMES)[number];

export type OrbitFunctionArguments = {
  /** The `action text` argument; absent for `orbit_edit_task(payload jsonb)`. */
  readonly action?: string;
  readonly payload: unknown;
};

export interface OrbitFunctions {
  call(name: OrbitFunctionName, args: OrbitFunctionArguments): Promise<unknown>;
}

/**
 * A SQL exception raised by a function, exposed as PostgREST would: `message` is the raise-exception text,
 * `code` the SQLSTATE (PT400/PT404/PT409 for the portal's own errors).
 */
export class OrbitFunctionError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code: string | undefined) {
    super(message);
    this.name = 'OrbitFunctionError';
    this.code = code;
  }
}
