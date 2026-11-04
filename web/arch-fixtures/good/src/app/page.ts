// Fixture: a route may import adapter/in/web, config/container.ts and packages.
import { createElement } from 'react';
import { handle } from '../request/adapter/in/web/Controller.ts';
import { service } from '../config/container.ts';

export default function Page() {
  return createElement('p', null, handle(service));
}
