// Writes and the history read of the improvement dialog, as plain async flows (UI-DESIGN D6). The component hands in
// the typed api and the few portal actions it needs.
import type { ImprovementApi, ImprovementHistoryEvent, ImprovementItem, SaveImprovementBody } from './ImprovementApi.ts';

export type ImprovementActions = {
  toast(message: string): void;
  close(dialog: 'improvement'): void;
  render(): void;
};

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * Saves the form values. A new record sends no id or revision. On success: the dialog closes, the toast shows, the
 * screen is read again (render). On refusal the server's message is toasted and nothing else moves; false is returned
 * so the caller can enable the save button again.
 */
export async function saveImprovement(
  api: Pick<ImprovementApi, 'save'>,
  actions: ImprovementActions,
  item: ImprovementItem | undefined,
  value: Readonly<Record<string, string>>,
): Promise<boolean> {
  const body: SaveImprovementBody = item ? { id: item.id, revision: item.revision, value } : { value };
  try {
    await api.save(body);
  } catch (e) {
    actions.toast(messageOf(e));
    return false;
  }
  actions.close('improvement');
  actions.toast('개선 기록을 저장했습니다.');
  actions.render();
  return true;
}

/** The history button: the read is done anew on every press (`['improvement-history', id]`). A failure is toasted. */
export async function loadImprovementHistory(
  read: (id: string) => Promise<ImprovementHistoryEvent[]>,
  actions: Pick<ImprovementActions, 'toast'>,
  id: string,
): Promise<ImprovementHistoryEvent[] | null> {
  try {
    return await read(id);
  } catch (e) {
    actions.toast(messageOf(e));
    return null;
  }
}
