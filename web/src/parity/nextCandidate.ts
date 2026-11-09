// The Next candidate for the parity harness: the same handler the catch-all route /api/[...path] calls
// (container.pipeline.handle), built over a fresh PGlite with the credentials the recordings were made with.
// Page paths never reach this handler in the real app (src/proxy.ts screens them first), so it also answers the
// non-API paths with the legacy guard behavior.
import { createContainer } from '../config/container.ts';
import type { Container, ContainerOptions } from '../config/container.ts';
import { ADMIN_PASSWORD, VIEWER_PASSWORD } from './credentials.ts';
import type { Session } from './runner.ts';
import type { RouteDefinition } from '../shared/adapter/in/web/RouteRegistry.ts';
import type { AuthorizeRequestUseCase } from '../access/application/port/in/AuthorizeRequestUseCase.ts';
import type { ReportRuntime } from '../report/application/port/out/ReportRuntime.ts';
import type { OrbitFunctions } from '../shared/port/OrbitFunctions.ts';
import { accessRoutes } from '../access/adapter/in/web/routes.ts';
import { requestRoutes } from '../request/adapter/in/web/routes.ts';
import { createRequestUseCases } from '../request/application/service/createRequestUseCases.ts';
import { assignmentModule } from '../assignment/assignmentModule.ts';
import { attachmentModule } from '../attachment/attachmentModule.ts';
import { reportRoutes } from '../report/adapter/in/web/routes.ts';
import { createReportUseCases } from '../report/application/service/createReportUseCases.ts';
import { improvementRoutes } from '../improvement/adapter/in/web/routes.ts';
import { createImprovementUseCases } from '../improvement/application/service/ImprovementServices.ts';
import { settingsRoutes } from '../settings/adapter/in/web/routes.ts';
import { automationRoutes } from '../automation/adapter/in/web/routes.ts';
import { createSettingsUseCases } from '../settings/application/service/createSettingsUseCases.ts';
import { createAutomationUseCases } from '../automation/application/service/createAutomationUseCases.ts';

export type CandidateSession = Session & { readonly container: Container };

export const candidateEnvironment = (extra: Record<string, string | undefined> = {}): Record<string, string | undefined> => ({
  ADMIN_PASSWORD,
  VIEWER_PASSWORD,
  ...extra,
});

export async function startNextCandidate(options: ContainerOptions = {}): Promise<CandidateSession> {
  const container = createContainer(candidateEnvironment(), options);
  return { handle: container.pipeline.handle, stop: container.stop, container };
}

/** The route factories src/config/container.ts spreads into its registry, in its order. A security spec compares this list with the container source. */
export const ROUTE_FACTORY_NAMES = ['accessRoutes', 'requestRoutes', 'assignmentModule', 'attachmentModule', 'reportRoutes', 'improvementRoutes', 'settingsRoutes', 'automationRoutes'] as const;

/**
 * The container does not expose its route registry, so this rebuilds it from the same factories with a database that
 * is never opened (route definitions do not depend on it). Test use only.
 */
export function registeredRoutes(): readonly RouteDefinition[] {
  const never = (): Promise<OrbitFunctions> => Promise.reject(new Error('registry only: the database is never opened'));
  // Only route patterns are read, so the collaborators are inert (adapter/out is for config/container.ts alone).
  const authorize: AuthorizeRequestUseCase = { authorize: () => null, describeSession: (role) => ({ role, shared: false }) };
  const runtime: ReportRuntime = { nowIso: () => new Date(0).toISOString(), sha256Hex: () => '' };
  return [
    ...accessRoutes(authorize),
    ...requestRoutes(createRequestUseCases(never)),
    ...assignmentModule(never),
    ...attachmentModule(never),
    ...reportRoutes(createReportUseCases(never, runtime)),
    ...improvementRoutes(createImprovementUseCases(never)),
    ...settingsRoutes(createSettingsUseCases(never)),
    ...automationRoutes(createAutomationUseCases(never)),
  ];
}
