import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const sha256 = (url: URL): string => createHash('sha256').update(readFileSync(url)).digest('hex');

test('portal.css is a byte-for-byte copy of the legacy public/style.css (UI-DESIGN D9)', () => {
  const legacy = new URL('../../../../../../../public/style.css', import.meta.url);
  const copy = new URL('./portal.css', import.meta.url);
  assert.equal(sha256(copy), sha256(legacy));
});
