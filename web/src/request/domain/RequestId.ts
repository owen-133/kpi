export type RequestId = string & { readonly __brand: 'RequestId' };

export function createRequestId(value: string): RequestId {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('RequestId must be a non-empty string');
  }
  return value as RequestId;
}
