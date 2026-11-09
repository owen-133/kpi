// Parity of the attachment routes (R-015) and GET /api/kpi-status with the legacy portal.
// Covered: every char-kpi step on /files and /kpi-status. Setup and read-back steps are answered by the test-only
// scaffold (see assignment/adapter/in/web/subsetParity.ts). Covered-later: the report, improvement and settings steps.
import { subsetParity } from '../../../../assignment/adapter/in/web/subsetParity.ts';

subsetParity('attachment context', {
  scenario: 'char-kpi',
  ownPath: /\/(files(\/[^/]*)?|kpi-status)$/,
  setupLabels: ['ck-new-1', 'ck-new-2'],
  readBackLabels: ['ck-file-detail'],
});
