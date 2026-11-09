import type { TaskState } from '../../../../domain/taskStatus.ts';

const SVG = { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false } as const;

const STATE_SVG = { viewBox: '0 0 18 18', fill: 'none', 'aria-hidden': true, focusable: false } as const;
const INK = '#1a2130';

// Small pictures drawn for the board; they carry no text, so they never reach a button's name.
export function StatusMark(p: { state: TaskState }) {
  switch (p.state) {
    case 'waiting':
      return (
        <svg {...STATE_SVG}>
          <circle cx="9" cy="9" r="9" fill="currentColor" opacity="0.35" />
          <circle cx="9" cy="9" r="4.5" fill="currentColor" />
        </svg>
      );
    case 'working':
      return (
        <svg {...STATE_SVG}>
          <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="2" opacity="0.18" />
          <path d="M1 9A8 8 0 1 0 15.9 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
          <circle cx="1.2" cy="9" r="1.4" fill="currentColor" />
        </svg>
      );
    case 'blocked':
      return (
        <svg {...STATE_SVG}>
          <circle cx="9" cy="9" r="7" fill="currentColor" />
          <path d="M7.3 6.4v5.2M10.7 6.4v5.2" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case 'idle':
      return (
        <svg {...STATE_SVG}>
          <circle cx="9" cy="9" r="7" fill="currentColor" />
          <path d="M5.9 9.2l2.2 2.2 4.2-4.4" stroke={INK} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export function ChevronIcon(p: { open: boolean }) {
  return (
    <svg {...SVG}>
      <path d={p.open ? 'M3.5 6l4.5 4.5L12.5 6' : 'M6 3.5L10.5 8 6 12.5'} />
    </svg>
  );
}

export function FolderIcon() {
  return (
    <svg {...SVG} viewBox="1.55 1.55 12.9 12.9">
      <path d="M2 4.6A1.6 1.6 0 0 1 3.6 3h2.8l1.6 1.8h4.4A1.6 1.6 0 0 1 14 6.4v5A1.6 1.6 0 0 1 12.4 13H3.6A1.6 1.6 0 0 1 2 11.4z" fill="currentColor" stroke="none" opacity="0.9" />
      <path d="M2 7.4h12" stroke="#1a2130" strokeWidth="0.9" opacity="0.25" />
    </svg>
  );
}
