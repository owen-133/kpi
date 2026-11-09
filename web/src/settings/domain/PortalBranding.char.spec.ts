// R-032 (branding part): the default company name is 아이지넷; stored settings that still carry the retired platform
// name are shown with the new name; what the administrator wrote on purpose is kept as it is.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, normalizeSettings } from './PortalSettings.ts';
import { SITE_TITLE } from '../../app/site.ts';

describe('R-032 company branding', () => {
  // R-032
  it('the default portal name is 아이지넷, and so is the page title', () => {
    assert.equal(DEFAULT_SETTINGS.texts.portalName, '아이지넷');
    assert.equal(SITE_TITLE, '아이지넷');
  });
  // R-032
  it('settings stored with the retired platform texts are shown with the current defaults, and the stored object is not changed', () => {
    const original = { texts: { portalName: 'orbit.ops', pageEyebrow: 'ORBIT OPS · GENERAL AFFAIRS', footer: 'orbit.ops · 요청부터 완료까지, 업무의 모든 순간을 기록합니다.' } };
    const before = JSON.stringify(original);
    const settings = normalizeSettings(original);
    assert.equal(settings.texts.portalName, '아이지넷');
    assert.equal(settings.texts.pageEyebrow, DEFAULT_SETTINGS.texts.pageEyebrow);
    assert.doesNotMatch(JSON.stringify(settings.texts), /orbit[. _-]*ops/i);
    assert.equal(JSON.stringify(original), before);
  });
  // R-032 (the pair: what must NOT be rewritten)
  it('a name and texts the administrator chose, and an uploaded logo, are kept untouched', () => {
    const custom = normalizeSettings({ texts: { portalName: '아이지넷 피플팀', bannerTitle: '우리 팀의 업무' }, logo: 'data:image/png;base64,AAAA' });
    assert.equal(custom.texts.portalName, '아이지넷 피플팀');
    assert.equal(custom.texts.bannerTitle, '우리 팀의 업무');
    assert.equal(custom.logo, 'data:image/png;base64,AAAA');
  });
  // R-032
  it('the retired name inside a longer text is replaced by the company name in any spelling, other words stay', () => {
    const settings = normalizeSettings({ texts: { footer: 'Orbit Ops 와 ORBIT-OPS 그리고 orbit_ops 안내' } });
    assert.equal(settings.texts.footer, '아이지넷 와 아이지넷 그리고 아이지넷 안내');
  });
});
