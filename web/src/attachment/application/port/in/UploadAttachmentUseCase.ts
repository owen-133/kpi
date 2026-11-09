import type { AttachmentUpload } from '../../../domain/AttachmentUpload.ts';

export type UploadAttachmentCommand = { readonly taskId: string; readonly upload: AttachmentUpload };

export interface UploadAttachmentUseCase {
  upload(command: UploadAttachmentCommand): Promise<{ readonly id: string }>;
}
