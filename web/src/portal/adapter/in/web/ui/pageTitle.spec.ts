import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DEFAULT_SETTINGS } from '../../../../../settings/domain/PortalSettings.ts';
import { documentTitle } from './shellTexts.ts';

const read = (relative: string): string => readFileSync(new URL(relative, import.meta.url), 'utf8');

test('the Next page title equals the <title> of the legacy page and the default documentTitle()', () => {
  const legacy = /<title>([^<]*)<\/title>/.exec(read('../../../../../../../public/index.html'))?.[1];
  assert.equal(legacy, '아이지넷 · 총무 업무 포털');
  assert.equal(documentTitle(DEFAULT_SETTINGS.texts), legacy);
  // app/ may not import the domain, so the page title is checked in its source text
  const site = read('../../../../../app/site.ts');
  assert.match(site, /SITE_TITLE = "아이지넷";/);
  assert.match(site, /PAGE_TITLE = `\$\{SITE_TITLE\} · 총무 업무 포털`;/);
  assert.match(read('../../../../../app/layout.tsx'), /metadata = \{ title: PAGE_TITLE \}/);
});
