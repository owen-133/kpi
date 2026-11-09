import { createHash } from 'node:crypto';
import type { ReportRuntime } from '../../../application/port/out/ReportRuntime.ts';

export class NodeReportRuntime implements ReportRuntime {
  nowIso(): string {
    return new Date().toISOString();
  }

  sha256Hex(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }
}
