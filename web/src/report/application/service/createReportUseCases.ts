import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { ReportUseCases } from '../port/in/ReportUseCases.ts';
import type { ReportRuntime } from '../port/out/ReportRuntime.ts';
import { KpiStatusService, ListReportsService } from './ListReportsService.ts';
import { PreviewReportService } from './PreviewReportService.ts';
import { PublishReportService } from './PublishReportService.ts';

/** Composition helper for config/container.ts: every report use case over one database accessor. */
export function createReportUseCases(orbit: () => Promise<OrbitFunctions>, runtime: ReportRuntime): ReportUseCases {
  return {
    preview: new PreviewReportService(orbit, runtime),
    publish: new PublishReportService(orbit, runtime),
    list: new ListReportsService(orbit),
    kpiStatus: new KpiStatusService(orbit),
  };
}
