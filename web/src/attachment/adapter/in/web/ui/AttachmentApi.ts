import type { ApiClient } from '../../../../../shared/adapter/in/web/ui/apiClient.ts';

/** `content` is the base64 part of the file's data URL. */
export type UploadBody = { readonly name: string; readonly content: string };

export interface AttachmentApi {
  upload(taskId: string, body: UploadBody): Promise<{ readonly id: string }>;
  remove(taskId: string, fileId: string): Promise<{ readonly ok: true }>;
  /** The legacy portal downloads with a plain link, not a fetch. */
  downloadUrl(taskId: string, fileId: string): string;
}

export function createAttachmentApi(client: ApiClient): AttachmentApi {
  return {
    upload: (taskId, body) => client.request<{ id: string }>('tasks/' + taskId + '/files', body),
    // an empty object, not no body: the delete is a POST
    remove: (taskId, fileId) => client.request<{ ok: true }>('tasks/' + taskId + '/files/' + fileId, {}),
    downloadUrl: (taskId, fileId) => `/api/tasks/${taskId}/files/${fileId}`,
  };
}
