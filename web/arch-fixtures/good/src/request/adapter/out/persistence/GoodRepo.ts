// Fixture: compliant outbound adapter (packages and ports are allowed).
import { createClient } from 'some-sdk';
import { Good } from '../../../domain/Good.ts';
import type { Repo } from '../../../application/port/out/Repo.ts';

export class GoodRepo implements Repo {
  find(id: string): Good | null {
    return createClient() ? new Good(id) : null;
  }
}
