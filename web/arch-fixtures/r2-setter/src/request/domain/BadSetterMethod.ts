// Fixture: Rule 2 violation, setter method.
export class Thing {
  readonly id = 'x';
  #status = 'new';

  setStatus(next: string): void {
    this.#status = next;
  }
}
