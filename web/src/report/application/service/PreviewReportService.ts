import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import { monthlyDraft } from '../../domain/MonthlyDraft.ts';
import { monthlyMetrics } from '../../domain/MonthlyMetrics.ts';
import { fingerprintSource } from '../../domain/ReportFingerprint.ts';
import type { PreviewReportQuery, ReportPreview } from '../port/in/ReportUseCases.ts';
import type { ReportRuntime } from '../port/out/ReportRuntime.ts';
import { loadTaskSnapshot } from './loadTaskSnapshot.ts';

export class PreviewReportService implements PreviewReportQuery {
  private readonly orbit: () => Promise<OrbitFunctions>;
  private readonly runtime: ReportRuntime;

  constructor(orbit: () => Promise<OrbitFunctions>, runtime: ReportRuntime) {
    this.orbit = orbit;
    this.runtime = runtime;
  }

  async preview(month: string | null): Promise<ReportPreview> {
    const tasks = await loadTaskSnapshot(await this.orbit());
    const nowIso = this.runtime.nowIso();
    // A missing month is the text 'null' in the legacy code and fails the shape check like any other bad month.
    const metrics = monthlyMetrics(tasks, String(month), nowIso);
    return { metrics, draft: monthlyDraft(metrics), fingerprint: this.runtime.sha256Hex(fingerprintSource(tasks, nowIso)) };
  }
}
