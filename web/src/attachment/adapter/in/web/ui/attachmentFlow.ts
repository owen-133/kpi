import type { AttachmentApi } from './AttachmentApi.ts';

// The file part of the detail extensions (legacy bindTaskExtensions in public/kpi-ui.js). Pure flow functions;
// reading the file is a port (`readBase64`) so the flow runs without a browser.

export const MAX_FILE_BYTES = 1048576;
export const FILE_SIZE_MESSAGE = '파일은 1바이트~1MB까지 가능합니다.';
export const UPLOAD_FAILED_MESSAGE = '파일 업로드 실패';
export const UPLOADED_TOAST = '첨부파일을 저장했습니다.';
export const DELETE_CONFIRM = '첨부파일을 삭제할까요? 삭제 사실은 업무 이력에 남습니다.';

export type PickedFile = { readonly name: string; readonly size: number };

export type UploadDeps<F extends PickedFile> = {
  readonly api: Pick<AttachmentApi, 'upload'>;
  readonly toast: (message: string) => void;
  readonly reload: () => Promise<void>;
  /** The base64 content of the file; a rejection without a message counts as a failed upload. */
  readonly readBase64: (file: F) => Promise<string>;
  /** Disables (true) or enables (false) the file input. */
  readonly setDisabled: (on: boolean) => void;
  /** Empties the file input. */
  readonly clear: () => void;
};

export type DeleteDeps = {
  readonly api: Pick<AttachmentApi, 'remove'>;
  readonly toast: (message: string) => void;
  readonly reload: () => Promise<void>;
  readonly confirm: (message: string) => boolean;
};

export type UploadOutcome = 'uploaded' | 'none' | 'refused' | 'failed';
export type DeleteOutcome = 'done' | 'cancelled' | 'failed';

// legacy `e.message||'파일 업로드 실패'`: the reader rejects with an event that has no message
function uploadFailure(error: unknown): string {
  const message = typeof error === 'object' && error !== null ? (error as { message?: unknown }).message : undefined;
  return typeof message === 'string' && message !== '' ? message : UPLOAD_FAILED_MESSAGE;
}

export async function uploadAttachment<F extends PickedFile>(taskId: string, file: F | undefined, deps: UploadDeps<F>): Promise<UploadOutcome> {
  if (!file) return 'none';
  if (file.size > MAX_FILE_BYTES || file.size === 0) {
    deps.toast(FILE_SIZE_MESSAGE);
    deps.clear();
    return 'refused';
  }
  deps.setDisabled(true);
  try {
    const content = await deps.readBase64(file);
    await deps.api.upload(taskId, { name: file.name, content });
    await deps.reload();
    deps.toast(UPLOADED_TOAST);
    return 'uploaded';
  } catch (error) {
    deps.toast(uploadFailure(error));
    deps.setDisabled(false);
    return 'failed';
  }
}

/** A success is silent: the reloaded detail shows the file gone. */
export async function deleteAttachment(taskId: string, fileId: string, deps: DeleteDeps): Promise<DeleteOutcome> {
  if (!deps.confirm(DELETE_CONFIRM)) return 'cancelled';
  try {
    await deps.api.remove(taskId, fileId);
    await deps.reload();
    return 'done';
  } catch (error) {
    deps.toast(error instanceof Error ? error.message : String(error));
    return 'failed';
  }
}
