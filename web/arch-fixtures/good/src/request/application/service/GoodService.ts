// Fixture: compliant application service.
import { Good } from '../../domain/Good.ts';
import type { UseCase } from '../port/in/UseCase.ts';
import type { Repo } from '../port/out/Repo.ts';

export class GoodService implements UseCase {
  private readonly repo: Repo;

  constructor(repo: Repo) {
    this.repo = repo;
  }

  run(): Good {
    return this.repo.find('x') ?? new Good('x');
  }
}
