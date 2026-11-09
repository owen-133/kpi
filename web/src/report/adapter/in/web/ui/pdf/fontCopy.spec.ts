import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// sha256 of the original asset that was copied byte for byte
const FONT_SHA256 = '76f45ef4a6bcff344c837c95a7dcc26e017e38b5846d5ae0cdcb5b86be2e2d31';

// docs/architecture.md 「화면 구조 규칙」: the report font is served from the same URL (/fonts/NanumGothic-Regular.ttf) as the original page
test('the report font of the new app is a byte-for-byte copy of the original NanumGothic-Regular.ttf', () => {
  const copy = readFileSync(new URL('../../../../../../../public/fonts/NanumGothic-Regular.ttf', import.meta.url));
  assert.equal(createHash('sha256').update(copy).digest('hex'), FONT_SHA256);
});
