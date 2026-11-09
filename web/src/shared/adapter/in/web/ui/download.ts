// Browser file download behind a small port so it can be tested without a DOM.
export type DownloadPort = {
  createObjectUrl(blob: Blob): string;
  click(url: string, filename: string): void;
  revokeObjectUrl(url: string): void;
  later(run: () => void, ms: number): void;
};

const REVOKE_AFTER_MS = 1000;

// legacy: href = object url, download = name, click, revoke after one second
export function downloadBlob(port: DownloadPort, filename: string, blob: Blob): void {
  const url = port.createObjectUrl(blob);
  port.click(url, filename);
  port.later(() => port.revokeObjectUrl(url), REVOKE_AFTER_MS);
}

// legacy `download()` of public/kpi-ui.js: a byte order mark goes in front so spreadsheets read Korean text correctly
export function downloadText(port: DownloadPort, filename: string, content: string, type = 'text/plain;charset=utf-8'): void {
  downloadBlob(port, filename, new Blob(['﻿', content], { type }));
}

// The port of a real browser page.
export function browserDownloadPort(): DownloadPort {
  return {
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    click(url, filename) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
    },
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    later: (run, ms) => {
      setTimeout(run, ms);
    },
  };
}
