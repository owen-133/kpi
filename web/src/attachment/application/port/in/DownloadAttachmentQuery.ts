export type AttachmentReference = { readonly taskId: string; readonly fileId: string };
export type DownloadedAttachment = { readonly name: string; readonly bytes: Uint8Array };

export interface DownloadAttachmentQuery {
  download(reference: AttachmentReference): Promise<DownloadedAttachment>;
}
