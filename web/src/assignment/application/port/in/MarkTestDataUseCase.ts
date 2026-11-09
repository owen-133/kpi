export type MarkTestDataCommand = { readonly taskId: string; readonly isTest: boolean };

export interface MarkTestDataUseCase {
  mark(command: MarkTestDataCommand): Promise<{ readonly ok: true }>;
}
