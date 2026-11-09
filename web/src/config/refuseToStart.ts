import { assertStartupAllowed } from './startupChecks.ts';
import type { Environment } from './startupChecks.ts';

/** Node runtime only. Prints the refusal and ends the process with exit code 1 (see src/instrumentation.ts). */
export function refuseToStartWhenMisconfigured(env: Environment): void {
  try {
    assertStartupAllowed(env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'startup refused');
    process.exit(1);
  }
}
