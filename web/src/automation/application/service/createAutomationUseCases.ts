import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { AutomationUseCases } from '../port/in/AutomationUseCases.ts';
import { SuggestForRequestService } from './SuggestForRequestService.ts';

/** `database` opens the database on first use, so building the use cases never connects. */
export function createAutomationUseCases(database: () => Promise<OrbitFunctions>): AutomationUseCases {
  return { suggestForRequest: new SuggestForRequestService(database) };
}
