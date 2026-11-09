import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import { OrbitFunctionError } from '../../../shared/port/OrbitFunctions.ts';
import { categoriesOrDefault } from '../../../shared/domain/categories.ts';
import { AUTOMATION_METHOD, classify, mergeExtras, similarTasks } from '../../domain/automation.ts';
import type { TaskSnapshot } from '../../domain/automation.ts';
import type { AutomationSuggestion, SuggestForRequestUseCase } from '../port/in/SuggestForRequestUseCase.ts';

/** PostgREST answers PGRST202 for an unknown function, Postgres itself 42883 (undefined_function). */
function isFunctionMissing(error: unknown): boolean {
  return error instanceof OrbitFunctionError && (error.code === 'PGRST202' || error.code === '42883');
}

export class SuggestForRequestService implements SuggestForRequestUseCase {
  private readonly database: () => Promise<OrbitFunctions>;

  constructor(database: () => Promise<OrbitFunctions>) {
    this.database = database;
  }

  async suggest(text: string): Promise<AutomationSuggestion> {
    const functions = await this.database();
    const categories = categoriesOrDefault(await this.storedSettings(functions));
    const tasks = await this.taskSnapshot(functions);
    return { classification: classify(text, categories), similar: similarTasks(text, tasks), method: AUTOMATION_METHOD };
  }

  // Settings never saved, or the settings function not installed yet: the default categories apply.
  private async storedSettings(functions: OrbitFunctions): Promise<{ readonly categories?: readonly string[] } | null> {
    try {
      const stored = (await functions.call('orbit_settings', { action: 'get', payload: {} })) as { values?: { categories?: readonly string[] } };
      return stored.values ?? null;
    } catch (error) {
      if (isFunctionMissing(error)) return null;
      throw error;
    }
  }

  private async taskSnapshot(functions: OrbitFunctions): Promise<TaskSnapshot[]> {
    const tasks = (await functions.call('orbit_api', { action: 'list', payload: {} })) as TaskSnapshot[];
    let extras: Array<Record<string, unknown>> = [];
    try {
      extras = (await functions.call('orbit_kpi', { action: 'extras', payload: {} })) as Array<Record<string, unknown>>;
    } catch (error) {
      if (!isFunctionMissing(error)) throw error;
    }
    return mergeExtras(tasks, extras);
  }
}
