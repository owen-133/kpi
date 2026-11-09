// Composition root: the only place that wires adapters to use cases and routes.
// Database: DATABASE_URL set -> postgres-js over verified TLS (production); unset and not production -> an in-memory
// PGlite loaded with supabase/*.sql (development and tests); production without DATABASE_URL throws.
import { AccessConfiguration } from '../access/domain/AccessConfiguration.ts';
import { AuthorizeRequestService } from '../access/application/service/AuthorizeRequestService.ts';
import { Sha256SecretComparator } from '../access/adapter/out/crypto/Sha256SecretComparator.ts';
import { accessRoutes } from '../access/adapter/in/web/routes.ts';
import { createGuardPipeline } from '../access/adapter/in/web/guardPipeline.ts';
import type { GuardPipeline } from '../access/adapter/in/web/guardPipeline.ts';
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
import type { RouteDefinition } from '../shared/adapter/in/web/RouteRegistry.ts';
import type { OrbitFunctions } from '../shared/port/OrbitFunctions.ts';
import type { Environment } from './startupChecks.ts';

export type Container = {
  readonly pipeline: GuardPipeline;
  /** Opens the database on first use; the guard itself never needs it. */
  readonly orbitFunctions: () => Promise<OrbitFunctions>;
  readonly stop: () => Promise<void>;
};

export type ContainerOptions = {
  /** Routes added after the registered ones (tests only). */
  readonly extraRoutes?: readonly RouteDefinition[];
  readonly log?: (line: string) => void;
};

function openOrbitFunctions(env: Environment): { open: () => Promise<OrbitFunctions>; close: () => Promise<void> } {
  let opened: Promise<OrbitFunctions> | undefined;
  const open = () => {
    opened ??= (async () => {
      if (env.DATABASE_URL) {
        const { createDatabase } = await import('./database.ts');
        const { PostgresOrbitFunctions } = await import('../shared/adapter/out/PostgresOrbitFunctions.ts');
        return new PostgresOrbitFunctions(createDatabase(env.DATABASE_URL, env.DATABASE_CA));
      }
      const { PgliteOrbitFunctions } = await import('../shared/adapter/out/PgliteOrbitFunctions.ts');
      return PgliteOrbitFunctions.create();
    })();
    return opened;
  };
  const close = async () => {
    if (opened === undefined) return;
    const closable = (await opened) as { close?: () => Promise<void> };
    await closable.close?.();
  };
  return { open, close };
}

/** Builds a fresh container from the given environment. Throws when the environment is not allowed to start. */
export function createContainer(env: Environment = {}, options: ContainerOptions = {}): Container {
  const production = env.NODE_ENV === 'production';
  if (production && !env.DATABASE_URL) throw new Error('운영 배포에는 DATABASE_URL이 필요합니다.');
  const configuration = AccessConfiguration.create({ adminPassword: env.ADMIN_PASSWORD, viewerPassword: env.VIEWER_PASSWORD, production });
  const authorize = new AuthorizeRequestService(configuration, new Sha256SecretComparator());
  const routes: RouteDefinition[] = [
    ...accessRoutes(authorize),
    ...requestRoutes(createRequestUseCases(() => database.open())),
    ...assignmentModule(() => database.open()),
    ...attachmentModule(() => database.open()),
    ...reportRoutes(createReportUseCases(() => database.open(), new NodeReportRuntime())),
    ...improvementRoutes(createImprovementUseCases(() => database.open())),
    ...settingsRoutes(createSettingsUseCases(() => database.open())),
    ...automationRoutes(createAutomationUseCases(() => database.open())),
    ...(options.extraRoutes ?? []),
  ];
  const database = openOrbitFunctions(env);
  return {
    pipeline: createGuardPipeline({ authorize, routes, log: options.log ?? ((line) => console.error(line)) }),
    orbitFunctions: database.open,
    stop: database.close,
  };
}

const CONTAINER_KEY = 'orbit-ops.container';

/** One container per process; kept on globalThis so Next dev reloads (and the proxy and route bundles) share it. */
export function getContainer(): Container {
  const holder = globalThis as unknown as Record<string, Container | undefined>;
  const existing = holder[CONTAINER_KEY];
  if (existing !== undefined) return existing;
  const created = createContainer(process.env);
  holder[CONTAINER_KEY] = created;
  return created;
}
