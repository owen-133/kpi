// Fixture: the composition root may import adapter/out and application services.
import { GoodRepo } from '../request/adapter/out/persistence/GoodRepo.ts';
import { GoodService } from '../request/application/service/GoodService.ts';

export const service = new GoodService(new GoodRepo());
