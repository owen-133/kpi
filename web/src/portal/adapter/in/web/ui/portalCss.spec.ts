import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// sha256 of the original asset that was copied byte for byte
const STYLE_CSS_SHA256 = '48937c49787fc214f779a87997a2c3384137cc11f4cc16ac7db5195ef58a4686';

test('portal.css is a byte-for-byte copy of the original portal stylesheet (docs/architecture.md §8)', () => {
  const copy = readFileSync(new URL('./portal.css', import.meta.url));
  assert.equal(createHash('sha256').update(copy).digest('hex'), STYLE_CSS_SHA256);
});
