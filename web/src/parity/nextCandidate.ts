// The Next candidate for the parity harness: the same handler the catch-all route /api/[...path] calls
// (container.pipeline.handle), built over a fresh PGlite with the same credentials as the legacy oracle.
// Page paths never reach this handler in the real app (src/proxy.ts screens them first), so it also answers the
// non-API paths with the legacy guard behavior.
import { createContainer } from '../config/container.ts';
import type { Container, ContainerOptions } from '../config/container.ts';
import { ADMIN_PASSWORD, VIEWER_PASSWORD } from './legacyOracle.ts';
import type { Session } from './runner.ts';

export type CandidateSession = Session & { readonly container: Container };

export const candidateEnvironment = (extra: Record<string, string | undefined> = {}): Record<string, string | undefined> => ({
  ADMIN_PASSWORD,
  VIEWER_PASSWORD,
  ...extra,
});

export async function startNextCandidate(options: ContainerOptions = {}): Promise<CandidateSession> {
  const container = createContainer(candidateEnvironment(), options);
  return { handle: container.pipeline.handle, stop: container.stop, container };
}
