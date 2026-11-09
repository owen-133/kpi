import type { AttachmentReference } from './DownloadAttachmentQuery.ts';

export interface DeleteAttachmentUseCase {
  delete(reference: AttachmentReference): Promise<{ readonly ok: true }>;
}
