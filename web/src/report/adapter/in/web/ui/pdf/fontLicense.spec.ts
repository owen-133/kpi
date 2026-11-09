import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const fonts = (name: string): URL => new URL(`../../../../../../../public/fonts/${name}`, import.meta.url);

// sha256 of the original asset that was copied byte for byte
const OFL_SHA256 = 'eeacf16032901d0ed0456876ec77b8f0fda6b3fecec7d972f8543eb602e6c30f';

// The font is redistributed with the app, so its licence and source note ship in the same folder
for (const name of ['NanumGothic-Regular.ttf', 'OFL.txt', 'SOURCE.txt']) {
  test(`public/fonts/${name} exists and is not empty`, () => {
    assert.ok(statSync(fonts(name)).size > 0);
  });
}

test('public/fonts/OFL.txt is byte-identical to the original licence text', () => {
  assert.equal(createHash('sha256').update(readFileSync(fonts('OFL.txt'))).digest('hex'), OFL_SHA256);
});
