// The Next candidate for the parity harness: the same handler the catch-all route /api/[...path] calls
// (container.pipeline.handle), built over a fresh PGlite with the same credentials as the legacy oracle.
// Page paths never reach this handler in the real app (src/proxy.ts screens them first), so it also answers the
// non-API paths with the legacy guard behavior.
import { createContainer } from '../config/container.ts';
import type { Container, ContainerOptions } from '../config/container.ts';
import { ADMIN_PASSWORD, VIEWER_PASSWORD } from './legacyOracle.ts';
import type { Session } from './runner.ts';
import type { RouteDefinition } from '../shared/adapter/in/web/RouteRegistry.ts';
import type { OrbitFunctions } from '../shared/port/OrbitFunctions.ts';
import { AccessConfiguration } from '../access/domain/AccessConfiguration.ts';
import { AuthorizeRequestService } from '../access/application/service/AuthorizeRequestService.ts';
import { Sha256SecretComparator } from '../access/adapter/out/crypto/Sha256SecretComparator.ts';
import { accessRoutes } from '../access/adapter/in/web/routes.ts';
import { requestRoutes } from '../request/adapter/in/web/routes.ts';
import { createRequestUseCases } from '../request/application/service/createRequestUseCases.ts';
import { assignmentModule } from '../assignment/assignmentModule.ts';
import { attachmentModule } from '../attachment/attachmentModule.ts';
import { reportRoutes } from '../report/adapter/in/web/routes.ts';
import { createReportUseCases } from '../report/application/service/createReportUseCases.ts';
import { NodeReportRuntime } from '../report/adapter/out/system/NodeReportRuntime.ts';
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
  const configuration = AccessConfiguration.create({ adminPassword: ADMIN_PASSWORD, viewerPassword: VIEWER_PASSWORD, production: false });
  const authorize = new AuthorizeRequestService(configuration, new Sha256SecretComparator());
  return [
    ...accessRoutes(authorize),
    ...requestRoutes(createRequestUseCases(never)),
    ...assignmentModule(never),
    ...attachmentModule(never),
    ...reportRoutes(createReportUseCases(never, new NodeReportRuntime())),
    ...improvementRoutes(createImprovementUseCases(never)),
    ...settingsRoutes(createSettingsUseCases(never)),
    ...automationRoutes(createAutomationUseCases(never)),
  ];
}
