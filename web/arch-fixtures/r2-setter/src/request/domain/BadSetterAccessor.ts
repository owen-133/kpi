// Fixture: Rule 2 violation, setter accessor.
export class Thing {
  #status = 'new';

  set status(next: string) {
    this.#status = next;
  }
}
