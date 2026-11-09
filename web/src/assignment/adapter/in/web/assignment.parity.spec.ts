// Parity of the assignment routes (R-020, R-021, kpi-status) with the legacy portal.
// Covered: every char-tasks step on /assign and /test-data. Setup and read-back steps are answered by the test-only
// scaffold (see subsetParity.ts). Covered-later: every other char-tasks step (task creation limits, edit, list) belongs
// to the request context. GET /api/kpi-status is a step of char-kpi, run by the attachment parity spec.
import { subsetParity } from './subsetParity.ts';

subsetParity('assignment context', {
  scenario: 'char-tasks',
  ownPath: /\/(assign|test-data)$/,
  setupLabels: ['ct-new-1', 'ct-new-2'],
  readBackLabels: ['ct-detail-after-assign', 'ct-testdata-detail-true', 'ct-testdata-detail-after'],
});
