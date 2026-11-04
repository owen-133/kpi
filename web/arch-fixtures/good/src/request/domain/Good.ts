// Fixture: compliant domain class.
export class Good {
  readonly id: string;
  #status: string;
  private note = '';
  readonly tags: string[] = [];

  constructor(id: string) {
    this.id = id;
    this.#status = 'new';
  }

  get status(): string {
    return this.#status;
  }

  withNote(next: string): Good {
    const copy = new Good(this.id);
    copy.note = next;
    return copy;
  }
}
