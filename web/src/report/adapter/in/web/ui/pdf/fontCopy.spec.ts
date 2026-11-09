import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const sha256 = (url: URL): string => createHash('sha256').update(readFileSync(url)).digest('hex');

// UI-DESIGN D11: the report font is served from the same URL (/fonts/NanumGothic-Regular.ttf) as the legacy page
test('the report font of the new app is a byte-for-byte copy of the legacy public/fonts/NanumGothic-Regular.ttf', () => {
  const legacy = new URL('../../../../../../../../public/fonts/NanumGothic-Regular.ttf', import.meta.url);
  const copy = new URL('../../../../../../../public/fonts/NanumGothic-Regular.ttf', import.meta.url);
  assert.equal(sha256(copy), sha256(legacy));
});
