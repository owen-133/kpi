'use client';

import { useRef, useState } from 'react';
import { usePortal } from '../../../../../portal/adapter/in/web/ui/PortalContext.tsx';
import { formatFileSize } from '../../../../../shared/adapter/in/web/ui/format.ts';
import { deleteAttachment, uploadAttachment, type DeleteDeps } from './attachmentFlow.ts';
import { readFileAsBase64 } from './fileReader.ts';

export type AttachmentFile = { readonly id: string; readonly name: string; readonly size: number };

/** The file list and the upload field of the detail extensions (legacy bindTaskExtensions). `reload` draws the detail anew. */
export function AttachmentSection(p: { taskId: string; files: readonly AttachmentFile[]; editable: boolean; reload: () => Promise<void> }) {
  const { apis, actions } = usePortal();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const removal: DeleteDeps = { api: apis.attachment, toast: actions.toast, reload: p.reload, confirm: (message) => window.confirm(message) };
  return (
    <>
      <div className="file-list">
        {p.files.length ? (
          p.files.map((f) => (
            <div className="task-row" key={f.id}>
              <a href={apis.attachment.downloadUrl(p.taskId, f.id)}>{`${f.name} (${formatFileSize(f.size)})`}</a>
              {p.editable ? (
                <button className="danger" data-file-delete={f.id} onClick={() => void deleteAttachment(p.taskId, f.id, removal)}>
                  파일 삭제
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <p className="muted tiny">첨부파일이 없습니다.</p>
        )}
      </div>
      {p.editable ? (
        <label>
          첨부파일 추가 (최대 1MB, 업무당 10개)
          <input
            id="task-file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.xlsx,.docx"
            ref={input}
            disabled={uploading}
            onChange={() =>
              void uploadAttachment(p.taskId, input.current?.files?.[0], {
                api: apis.attachment,
                toast: actions.toast,
                reload: p.reload,
                readBase64: readFileAsBase64,
                setDisabled: setUploading,
                clear: () => {
                  if (input.current) input.current.value = '';
                },
              })
            }
          />
        </label>
      ) : null}
    </>
  );
}
