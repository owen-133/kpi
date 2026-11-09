import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { AddTaskNoteCommand, AddTaskNoteUseCase } from '../port/in/AddTaskNoteUseCase.ts';

export class AddTaskNoteService implements AddTaskNoteUseCase {
  private readonly functions: OrbitFunctions;

  constructor(functions: OrbitFunctions) {
    this.functions = functions;
  }

  add(command: AddTaskNoteCommand): Promise<unknown> {
    return this.functions.call('orbit_api', { action: 'note', payload: { id: command.id, note: command.note } });
  }
}
