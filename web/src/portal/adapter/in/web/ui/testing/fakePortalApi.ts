import { CallLog } from '../../../../../../shared/adapter/in/web/ui/testing/CallLog.ts';
import type { PortalApi, SessionView } from '../PortalApi.ts';

export class FakePortalApi implements PortalApi {
  readonly log = new CallLog();
  sessionView: SessionView = { role: 'admin', shared: true };

  async session(): Promise<SessionView> {
    this.log.record('session', []);
    return { ...this.sessionView };
  }
}
