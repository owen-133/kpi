// The bundle scanner itself: it must report a secret name or value planted in a client chunk, and stay quiet on a clean tree.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanDirectory } from './bundleScan.ts';

describe('scanDirectory', () => {
  it('reports a planted secret name and value, and nothing in a clean tree', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'bundle-scan-'));
    try {
      mkdirSync(path.join(root, 'chunks'));
      writeFileSync(path.join(root, 'chunks', 'clean.js'), 'console.log("hello")');
      assert.deepEqual(scanDirectory(root, ['ADMIN_PASSWORD', 'hunter2']), []);
      writeFileSync(path.join(root, 'chunks', 'leak.js'), 'const a = process.env.ADMIN_PASSWORD; const b = "hunter2";');
      assert.deepEqual(scanDirectory(root, ['ADMIN_PASSWORD', 'hunter2']).map((finding) => `${finding.file}:${finding.needle}`).sort(), ['chunks/leak.js:ADMIN_PASSWORD', 'chunks/leak.js:hunter2']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
