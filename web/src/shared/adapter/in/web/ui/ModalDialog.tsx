'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * A `<dialog id>` that is shown with showModal() while `open` is true (the legacy page never used `open` attributes).
 * Escape closes the element by itself and fires `close`, which is reported through `onClosed` so the state follows.
 */
export function ModalDialog(p: { id: string; open: boolean; onClosed: () => void; children?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { open } = p;
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      id={p.id}
      ref={ref}
      onClose={(event) => {
        // The close event of a programmatic close() arrives late; if the dialog was shown again meanwhile it is not closed.
        if (!event.currentTarget.open) p.onClosed();
      }}
    >
      {p.children}
    </dialog>
  );
}
