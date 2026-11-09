import { createHash, timingSafeEqual } from 'node:crypto';
import type { SecretComparator } from '../../../application/port/out/SecretComparator.ts';

/** Compares SHA-256 digests, so the comparison time depends on neither the secret's length nor its content. */
export class Sha256SecretComparator implements SecretComparator {
  equal(given: string, expected: string): boolean {
    const a = createHash('sha256').update(given, 'utf8').digest();
    const b = createHash('sha256').update(expected, 'utf8').digest();
    return timingSafeEqual(a, b);
  }
}
