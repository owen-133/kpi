// A production build owned by one spec run: it goes into its own directory (NEXT_DIST_DIR, read by next.config.ts), never
// into `.next`, so the result does not depend on whether a build exists or is stale. `next build` rewrites the tsconfig
// `include` for a custom distDir; the original file text is put back afterwards.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const WEB_DIRECTORY = path.resolve(import.meta.dirname, '..', '..');
export const NEXT_BIN = path.join(WEB_DIRECTORY, 'node_modules', 'next', 'dist', 'bin', 'next');
// `scratch/` is gitignored at any depth; Next requires the distDir to be inside web/.
const SCRATCH = path.join(WEB_DIRECTORY, 'scratch');

export type OwnBuild = {
  /** Path relative to web/, the value of NEXT_DIST_DIR. */
  readonly distDir: string;
  readonly absoluteDistDir: string;
  readonly output: string;
  remove(): void;
};

/** Why a build is impossible here, or null. */
export function buildBlocker(): string | null {
  return existsSync(NEXT_BIN) ? null : `next is not installed (${NEXT_BIN} missing): run \`npm ci\` first`;
}

/** Builds once into a fresh directory. Throws with the build output when the build fails. */
export function buildOwn(env: Record<string, string>): OwnBuild {
  const distDir = path.join('scratch', `spec-dist-${process.pid}-${Date.now()}`);
  const absoluteDistDir = path.join(WEB_DIRECTORY, distDir);
  mkdirSync(SCRATCH, { recursive: true });
  const tsconfigPath = path.join(WEB_DIRECTORY, 'tsconfig.json');
  const tsconfigBefore = readFileSync(tsconfigPath, 'utf8');
  const result = spawnSync(process.execPath, [NEXT_BIN, 'build'], {
    cwd: WEB_DIRECTORY,
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', NEXT_TELEMETRY_DISABLED: '1', ...env, NEXT_DIST_DIR: distDir } as unknown as NodeJS.ProcessEnv,
    encoding: 'utf8',
    timeout: 240_000,
  });
  if (readFileSync(tsconfigPath, 'utf8') !== tsconfigBefore) writeFileSync(tsconfigPath, tsconfigBefore);
  const output = `${result.stdout}\n${result.stderr}`;
  const remove = (): void => rmSync(absoluteDistDir, { recursive: true, force: true });
  if (result.status !== 0 || !existsSync(path.join(absoluteDistDir, 'BUILD_ID'))) {
    remove();
    throw new Error(`next build into ${distDir} failed (status ${result.status}):\n${output}`);
  }
  return { distDir, absoluteDistDir, output, remove };
}
