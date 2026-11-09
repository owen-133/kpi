import type { TaskState } from '../../../../domain/taskStatus.ts';

const SVG = { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false } as const;

// Small pictures drawn for the board; they carry no text, so they never reach a button's name.
export function StateIcon(p: { state: TaskState }) {
  switch (p.state) {
    case 'waiting':
      return (
        <svg {...SVG}>
          <circle cx="8" cy="8" r="3.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'working':
      return (
        <svg {...SVG}>
          <circle cx="8" cy="8" r="5.6" opacity="0.28" />
          <path d="M8 2.4a5.6 5.6 0 0 1 5.6 5.6" />
        </svg>
      );
    case 'blocked':
      return (
        <svg {...SVG}>
          <circle cx="8" cy="8" r="5.6" />
          <path d="M6.4 5.6v4.8M9.6 5.6v4.8" />
        </svg>
      );
    case 'idle':
      return (
        <svg {...SVG}>
          <circle cx="8" cy="8" r="5.6" fill="currentColor" stroke="none" opacity="0.9" />
          <path d="M5.4 8.2l1.8 1.8 3.4-3.6" stroke="#1a2130" />
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
    <svg {...SVG}>
      <path d="M2 4.6A1.6 1.6 0 0 1 3.6 3h2.8l1.6 1.8h4.4A1.6 1.6 0 0 1 14 6.4v5A1.6 1.6 0 0 1 12.4 13H3.6A1.6 1.6 0 0 1 2 11.4z" fill="currentColor" stroke="none" opacity="0.9" />
    </svg>
  );
}
