// Composition of the assignment context: services over the shared OrbitFunctions port, wrapped in the context's routes.
// The database is opened on first use, so building the routes never touches it.
import { AssignTaskService } from './application/service/AssignTaskService.ts';
import { GetKpiStatusService } from './application/service/GetKpiStatusService.ts';
import { MarkTestDataService } from './application/service/MarkTestDataService.ts';
import { assignmentRoutes } from './adapter/in/web/routes.ts';
import type { RouteDefinition } from '../shared/adapter/in/web/RouteRegistry.ts';
import type { OrbitFunctions } from '../shared/port/OrbitFunctions.ts';

export function assignmentModule(openDatabase: () => Promise<OrbitFunctions>): readonly RouteDefinition[] {
  const orbit: OrbitFunctions = { call: async (name, args) => (await openDatabase()).call(name, args) };
  return assignmentRoutes({
    assignTask: new AssignTaskService(orbit),
    markTestData: new MarkTestDataService(orbit),
    kpiStatus: new GetKpiStatusService(orbit),
  });
}
