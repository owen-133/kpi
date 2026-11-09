// Browser scenarios of the admin settings dialog, in the user's words. They need Playwright (see portal/testing/browserHarness.ts).
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { browserSkipReason, HARNESS_ADMIN, startBrowserHarness, type BrowserHarness } from '../../../../../portal/testing/browserHarness.ts';

type Locator = {
  click(): Promise<void>;
  fill(value: string): Promise<void>;
  inputValue(): Promise<string>;
  textContent(): Promise<string | null>;
  isVisible(): Promise<boolean>;
  isHidden(): Promise<boolean>;
  waitFor(options?: Record<string, unknown>): Promise<void>;
  setInputFiles(files: unknown): Promise<void>;
};
type Page = {
  goto(url: string): Promise<unknown>;
  locator(selector: string): Locator;
  on(event: 'dialog', handler: (d: { accept(): Promise<void>; dismiss(): Promise<void> }) => void): void;
  waitForTimeout(ms: number): Promise<void>;
};

const PIXEL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

const skip = browserSkipReason('settings.browser.spec');
describe('the admin settings dialog in a browser', { skip }, () => {
  let harness: BrowserHarness;
  before(async () => {
    harness = await startBrowserHarness();
  });
  after(async () => {
    await harness?.stop();
  });

  async function openDialog(): Promise<{ page: Page; close(): Promise<void> }> {
    const { page, close } = await harness.openPage(HARNESS_ADMIN);
    const p = page as unknown as Page;
    await p.goto(harness.base + '/');
    await p.locator('#admin-settings').click();
    await p.locator('#settings-form').waitFor();
    return { page: p, close };
  }

  it('a chosen PNG shows its file name until saved, and removing it goes back to the letter logo', async () => {
    const { page, close } = await openDialog();
    try {
      assert.equal(await page.locator('#logo-status').textContent(), '기본 글자 로고 사용 중');
      await page.locator('#logo-file').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PIXEL_PNG });
      await page.waitForTimeout(300);
      assert.equal(await page.locator('#logo-status').textContent(), 'logo.png · 저장하면 적용됩니다.');
      await page.locator('#remove-logo').click();
      assert.equal(await page.locator('#logo-status').textContent(), '기본 글자 로고 · 저장하면 적용됩니다.');
    } finally {
      await close();
    }
  });

  it('a file that is not PNG, JPEG or WebP is refused with the size and type message', async () => {
    const { page, close } = await openDialog();
    try {
      await page.locator('#logo-file').setInputFiles({ name: 'logo.txt', mimeType: 'text/plain', buffer: Buffer.from('no') });
      await page.locator('#settings-error').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#settings-error').textContent(), '200KB 이하의 PNG·JPEG·WebP 파일을 선택하세요.');
      assert.equal(await page.locator('#logo-file').inputValue(), '');
    } finally {
      await close();
    }
  });

  it('declining the reset question keeps what was typed, accepting it fills the defaults', async () => {
    const { page, close } = await openDialog();
    try {
      await page.locator('#settings-dialog [name="text_portalName"]').fill('임시 이름');
      let answer: 'accept' | 'dismiss' = 'dismiss';
      page.on('dialog', (d) => void (answer === 'accept' ? d.accept() : d.dismiss()));
      await page.locator('#reset-settings').click();
      assert.equal(await page.locator('#settings-dialog [name="text_portalName"]').inputValue(), '임시 이름');
      answer = 'accept';
      await page.locator('#reset-settings').click();
      await page.waitForTimeout(200);
      assert.equal(await page.locator('#settings-dialog [name="text_portalName"]').inputValue(), '아이지넷');
    } finally {
      await close();
    }
  });

  it('saving a changed name closes the dialog, shows the toast, and the change appears in the history after reopening', async () => {
    const { page, close } = await openDialog();
    try {
      await page.locator('#settings-dialog [name="text_portalName"]').fill('우리 회사 포털');
      await page.locator('#settings-form [type="submit"]').click();
      await page.locator('#toast').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#toast').textContent(), '관리자 설정이 저장되었습니다.');
      assert.equal(await page.locator('#settings-form').isHidden(), true);
      await page.locator('#admin-settings').click();
      await page.locator('#settings-history').click();
      await page.locator('#settings-history-content .event').waitFor();
      assert.match((await page.locator('#settings-history-content .event p').textContent()) ?? '', /포털 이름: 아이지넷 → 우리 회사 포털/);
    } finally {
      await close();
    }
  });
});
