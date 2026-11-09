/** Constant-time comparison of two secrets of any length. */
export interface SecretComparator {
  equal(given: string, expected: string): boolean;
}
