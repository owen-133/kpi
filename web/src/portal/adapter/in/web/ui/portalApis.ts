import type { ApiClient } from '../../../../../shared/adapter/in/web/ui/apiClient.ts';
import { createAssignmentApi, type AssignmentApi } from '../../../../../assignment/adapter/in/web/ui/AssignmentApi.ts';
import { createAttachmentApi, type AttachmentApi } from '../../../../../attachment/adapter/in/web/ui/AttachmentApi.ts';
import { createAutomationApi, type AutomationApi } from '../../../../../automation/adapter/in/web/ui/AutomationApi.ts';
import { createImprovementApi, type ImprovementApi } from '../../../../../improvement/adapter/in/web/ui/ImprovementApi.ts';
import { createReportApi, type ReportApi } from '../../../../../report/adapter/in/web/ui/ReportApi.ts';
import { createRequestApi, type RequestApi } from '../../../../../request/adapter/in/web/ui/RequestApi.ts';
import { createSettingsApi, type SettingsApi } from '../../../../../settings/adapter/in/web/ui/SettingsApi.ts';
import { createPortalApi, type PortalApi } from './PortalApi.ts';

/** All typed API clients of the browser, one per context, over one HTTP helper. */
export type PortalApis = {
  readonly portal: PortalApi;
  readonly settings: SettingsApi;
  readonly request: RequestApi;
  readonly report: ReportApi;
  readonly improvement: ImprovementApi;
  readonly assignment: AssignmentApi;
  readonly attachment: AttachmentApi;
  readonly automation: AutomationApi;
};

export function createPortalApis(client: ApiClient): PortalApis {
  return {
    portal: createPortalApi(client),
    settings: createSettingsApi(client),
    request: createRequestApi(client),
    report: createReportApi(client),
    improvement: createImprovementApi(client),
    assignment: createAssignmentApi(client),
    attachment: createAttachmentApi(client),
    automation: createAutomationApi(client),
  };
}
