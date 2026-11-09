// Recording helper of the in-memory fake APIs: every call is logged in order and a failure can be queued per method.
export type RecordedCall = { readonly method: string; readonly args: readonly unknown[] };

export class CallLog {
  readonly calls: RecordedCall[] = [];
  private readonly queued = new Map<string, string[]>();

  /** Logs the call, then throws the oldest queued failure of that method (once). */
  record(method: string, args: readonly unknown[]): void {
    this.calls.push({ method, args });
    const failure = this.queued.get(method)?.shift();
    if (failure !== undefined) throw new Error(failure);
  }

  /** The next call of `method` fails with `message`, like a server error answer. */
  failNext(method: string, message: string): void {
    this.queued.set(method, [...(this.queued.get(method) ?? []), message]);
  }

  names(): string[] {
    return this.calls.map((c) => c.method);
  }

  argsOf(method: string): readonly unknown[][] {
    return this.calls.filter((c) => c.method === method).map((c) => [...c.args]);
  }
}
