// Test doubles for the report services: a recording OrbitFunctions and a fixed runtime.
import { OrbitFunctionError } from '../../shared/port/OrbitFunctions.ts';
import type { OrbitFunctionArguments, OrbitFunctionName, OrbitFunctions } from '../../shared/port/OrbitFunctions.ts';
import type { ReportRuntime } from '../application/port/out/ReportRuntime.ts';
import { createHash } from 'node:crypto';

export type RecordedCall = { readonly name: OrbitFunctionName; readonly args: OrbitFunctionArguments };

export class FakeOrbit implements OrbitFunctions {
  readonly calls: RecordedCall[] = [];
  tasks: unknown[] = [];
  extras: unknown[] = [];
  failWith: OrbitFunctionError | Error | undefined;

  async call(name: OrbitFunctionName, args: OrbitFunctionArguments): Promise<unknown> {
    this.calls.push({ name, args });
    if (this.failWith !== undefined && args.action === 'report_save') throw this.failWith;
    if (name === 'orbit_api' && args.action === 'list') return this.tasks;
    if (name === 'orbit_kpi' && args.action === 'extras') return this.extras;
    if (name === 'orbit_kpi' && args.action === 'report_save') return { id: 'new-report' };
    return [];
  }

  saved(): RecordedCall[] {
    return this.calls.filter((c) => c.args.action === 'report_save');
  }
}

export class FixedRuntime implements ReportRuntime {
  now: string;

  constructor(now: string) {
    this.now = now;
  }

  nowIso(): string {
    return this.now;
  }

  sha256Hex(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }
}
