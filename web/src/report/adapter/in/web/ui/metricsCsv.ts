// The metrics CSV of the legacy report screen (public/kpi-ui.js): a two column text of every scalar metric, as the server
// sent them. Unlike the task and ledger CSVs it has no quoting and no formula guard; it is not unified with them.
import type { MonthlyMetrics } from '../../../../domain/MonthlyMetrics.ts';

export const metricsCsvFilename = (month: string): string => month + '_지표.csv';

// legacy: entries whose value is null or not an object (statuses and categories are left out); null is written 산정대상없음
export function metricsCsv(metrics: MonthlyMetrics): string {
  const lines = Object.entries(metrics)
    .filter(([, v]) => v === null || typeof v !== 'object')
    .map(([k, v]) => k + ',' + String(v ?? '산정대상없음'));
  return '지표,값\r\n' + lines.join('\r\n');
}
