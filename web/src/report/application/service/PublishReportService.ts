import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import { monthlyDraft } from '../../domain/MonthlyDraft.ts';
import { monthlyMetrics } from '../../domain/MonthlyMetrics.ts';
import { resolveReportDraft } from '../../domain/ReportDraft.ts';
import { FutureMonthError } from '../../domain/ReportErrors.ts';
import { fingerprintSource } from '../../domain/ReportFingerprint.ts';
import { isFutureMonth } from '../../domain/ReportMonth.ts';
import { StaleFingerprintError } from '../port/in/StaleFingerprintError.ts';
import type { PublishReportCommand, PublishReportUseCase } from '../port/in/ReportUseCases.ts';
import type { ReportRuntime } from '../port/out/ReportRuntime.ts';
import { loadTaskSnapshot } from './loadTaskSnapshot.ts';

const PUBLISH_METHOD = '담당자 검토 발행 · 규칙 기반 집계';

export class PublishReportService implements PublishReportUseCase {
  private readonly orbit: () => Promise<OrbitFunctions>;
  private readonly runtime: ReportRuntime;

  constructor(orbit: () => Promise<OrbitFunctions>, runtime: ReportRuntime) {
    this.orbit = orbit;
    this.runtime = runtime;
  }

  async publish(command: PublishReportCommand): Promise<unknown> {
    const month = String(command.month || '');
    const orbit = await this.orbit();
    const tasks = await loadTaskSnapshot(orbit);
    const nowIso = this.runtime.nowIso();
    // The fingerprint check comes before every month check: a stale caller learns that first.
    if (command.fingerprint !== this.runtime.sha256Hex(fingerprintSource(tasks, nowIso))) throw new StaleFingerprintError();
    const metrics = monthlyMetrics(tasks, month, nowIso);
    if (isFutureMonth(month, nowIso)) throw new FutureMonthError();
    const draft = resolveReportDraft(command.draft, () => monthlyDraft(metrics));
    return orbit.call('orbit_kpi', { action: 'report_save', payload: { month, value: { metrics, draft, method: PUBLISH_METHOD } } });
  }
}
