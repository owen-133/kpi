// Fixture: Rule 2 violation, public mutable field.
export class Thing {
  readonly id = 'x';
  status: string = 'new';
}
