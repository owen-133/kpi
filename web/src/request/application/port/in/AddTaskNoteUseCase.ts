export type AddTaskNoteCommand = { readonly id: string; readonly note: string };

export interface AddTaskNoteUseCase {
  add(command: AddTaskNoteCommand): Promise<unknown>;
}
