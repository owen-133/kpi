// The harness decides whether browser scenarios run; a wrong "can run" starts a build and a browser for nothing,
// a wrong "cannot run" skips the scenarios silently. Only the decision is tested here: booting needs Playwright.
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { browserBlocker, browserSkipReason, startBrowserHarness } from './browserHarness.ts';

const saved = { entry: process.env.ORBIT_PLAYWRIGHT_PATH, chromium: process.env.CHROMIUM_PATH };
afterEach(() => {
  for (const [key, value] of [['ORBIT_PLAYWRIGHT_PATH', saved.entry], ['CHROMIUM_PATH', saved.chromium]] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('browser harness availability', () => {
  it('is blocked, with the variable named, when ORBIT_PLAYWRIGHT_PATH is unset', () => {
    delete process.env.ORBIT_PLAYWRIGHT_PATH;
    assert.match(browserBlocker() ?? '', /ORBIT_PLAYWRIGHT_PATH is not set/);
  });

  it('is blocked when ORBIT_PLAYWRIGHT_PATH is empty or points at a missing file', () => {
    process.env.ORBIT_PLAYWRIGHT_PATH = '';
    assert.match(browserBlocker() ?? '', /not set/);
    process.env.ORBIT_PLAYWRIGHT_PATH = '/nonexistent/playwright.mjs';
    assert.match(browserBlocker() ?? '', /missing file: \/nonexistent\/playwright\.mjs/);
  });

  it('is blocked when the browser path is missing even though Playwright is found', () => {
    process.env.ORBIT_PLAYWRIGHT_PATH = import.meta.filename;
    delete process.env.CHROMIUM_PATH;
    assert.match(browserBlocker() ?? '', /CHROMIUM_PATH is not set/);
  });

  it('prints its reason and returns it when blocked, and returns false when nothing blocks', () => {
    delete process.env.ORBIT_PLAYWRIGHT_PATH;
    const lines: string[] = [];
    const original = console.log;
    console.log = (line: string) => { lines.push(line); };
    try {
      const reason = browserSkipReason('demo.spec');
      assert.equal(typeof reason, 'string');
      assert.equal(lines.length, 1);
      assert.match(lines[0], /^demo\.spec: skipped, ORBIT_PLAYWRIGHT_PATH is not set/);
    } finally {
      console.log = original;
    }
    if (browserBlocker() === null) assert.equal(browserSkipReason('demo.spec'), false);
  });

  it('refuses to start when blocked instead of building first', async () => {
    delete process.env.ORBIT_PLAYWRIGHT_PATH;
    await assert.rejects(startBrowserHarness(), /browser harness unavailable: ORBIT_PLAYWRIGHT_PATH is not set/);
  });
});
