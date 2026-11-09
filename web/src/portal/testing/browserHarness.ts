// Boots the production build and a Playwright browser for browser scenario specs. Playwright is not a dependency of web/:
// the spec runs only when ORBIT_PLAYWRIGHT_PATH points at it (`eval "$(node scripts/env-for-tests.mjs)"` sets it) and
// otherwise skips with a printed reason, the way production.security.spec.ts skips without a Next install.
//   const skip = browserSkipReason('portal.browser.spec'); // string | false, pass it as the `skip` option of describe/it
//   const harness = await startBrowserHarness();           // build once, `next start` on a free port, Chromium
// The server runs with NODE_ENV=test and no DATABASE_URL: a production environment refuses to start without one, and the
// scenarios seed an in-memory database through the HTTP API.
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { pathToFileURL } from 'node:url';
import { buildBlocker, buildOwn, NEXT_BIN, WEB_DIRECTORY } from '../../security/productionBuild.ts';

export const HARNESS_ADMIN = { user: 'admin', password: 'harness-admin' } as const;
export const HARNESS_VIEWER = { user: 'viewer', password: 'harness-viewer' } as const;

/** The slice of Playwright the scenarios use; the real module is loaded from ORBIT_PLAYWRIGHT_PATH, so it has no type here. */
export type HarnessPage = {
  goto(url: string): Promise<unknown>;
  [member: string]: unknown;
};
export type HarnessBrowser = {
  newContext(options: Record<string, unknown>): Promise<{ newPage(): Promise<HarnessPage>; close(): Promise<void> }>;
  close(): Promise<void>;
};

export type BrowserHarness = {
  readonly base: string;
  readonly browser: HarnessBrowser;
  /** A fresh page that is signed in with the given account. */
  openPage(who: { readonly user: string; readonly password: string }): Promise<{ page: HarnessPage; close(): Promise<void> }>;
  stop(): Promise<void>;
};

/** Why browser scenarios cannot run here, or null. */
export function browserBlocker(): string | null {
  const entry = process.env.ORBIT_PLAYWRIGHT_PATH;
  if (entry === undefined || entry === '') return 'ORBIT_PLAYWRIGHT_PATH is not set (run: eval "$(node scripts/env-for-tests.mjs)")';
  if (!existsSync(entry)) return `ORBIT_PLAYWRIGHT_PATH points at a missing file: ${entry}`;
  if (process.env.CHROMIUM_PATH === undefined || process.env.CHROMIUM_PATH === '') return 'CHROMIUM_PATH is not set (run: eval "$(node scripts/env-for-tests.mjs)")';
  return buildBlocker();
}

/** `false` when the scenarios can run, otherwise the reason, printed once so a skipped spec is never silent. */
export function browserSkipReason(spec: string): string | false {
  const reason = browserBlocker();
  if (reason !== null) console.log(`${spec}: skipped, ${reason}`);
  return reason ?? false;
}

const freePort = async (): Promise<number> => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as { port: number };
  server.close();
  await once(server, 'close');
  return port;
};

async function waitUntilAnswering(base: string, child: ChildProcess, log: () => string): Promise<void> {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`next start exited with code ${child.exitCode}: ${log()}`);
    try {
      await fetch(`${base}/`, { signal: AbortSignal.timeout(2000) });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`next start did not answer on ${base} within 60s: ${log()}`);
}

/** Builds the app into its own directory, serves it and opens Chromium. Call `stop()` in `after`. Throws with the reason when it cannot. */
export async function startBrowserHarness(): Promise<BrowserHarness> {
  const reason = browserBlocker();
  if (reason !== null) throw new Error(`browser harness unavailable: ${reason}`);
  const build = buildOwn({});
  const port = await freePort();
  let output = '';
  const server = spawn(process.execPath, [NEXT_BIN, 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: WEB_DIRECTORY,
    env: {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      NEXT_TELEMETRY_DISABLED: '1',
      NODE_ENV: 'test',
      NEXT_DIST_DIR: build.distDir,
      ADMIN_PASSWORD: HARNESS_ADMIN.password,
      VIEWER_PASSWORD: HARNESS_VIEWER.password,
    } as unknown as NodeJS.ProcessEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [server.stdout, server.stderr]) stream?.on('data', (chunk) => { output += String(chunk); });
  const base = `http://127.0.0.1:${port}`;
  const stopServer = async (): Promise<void> => {
    if (server.exitCode === null) {
      const done = once(server, 'exit');
      server.kill();
      await done;
    }
    build.remove();
  };
  try {
    await waitUntilAnswering(base, server, () => output.slice(-1500));
    const { chromium } = (await import(pathToFileURL(process.env.ORBIT_PLAYWRIGHT_PATH as string).href)) as {
      chromium: { launch(options: Record<string, unknown>): Promise<HarnessBrowser> };
    };
    const browser = await chromium.launch({ headless: true });
    return {
      base,
      browser,
      async openPage(who) {
        const context = await browser.newContext({
          httpCredentials: { username: who.user, password: who.password },
          viewport: { width: 1280, height: 900 },
          locale: 'ko-KR',
          timezoneId: 'Asia/Seoul',
        });
        return { page: await context.newPage(), close: () => context.close() };
      },
      async stop() {
        await browser.close();
        await stopServer();
      },
    };
  } catch (error) {
    await stopServer();
    throw error;
  }
}
