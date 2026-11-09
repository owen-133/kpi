'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';

export const TOAST_MS = 4000;

/** The `<div id="toast" role="status">` of the legacy page; the message and the display are set through the ref. */
export function Toast(p: { elementRef: RefObject<HTMLDivElement | null> }) {
  return <div id="toast" role="status" ref={p.elementRef} />;
}

/** Legacy `toast()`: text, display block, hidden again after 4 s; a new toast restarts the timer. */
export function useToast(): { elementRef: RefObject<HTMLDivElement | null>; toast: (message: string) => void } {
  const elementRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = useCallback((message: string) => {
    const el = elementRef.current;
    if (el === null) return;
    el.textContent = message;
    el.style.display = 'block';
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (elementRef.current !== null) elementRef.current.style.display = 'none';
    }, TOAST_MS);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { elementRef, toast };
}
