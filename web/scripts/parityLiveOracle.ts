// Preload of record-parity.ts (`node --import`): hands the REAL legacy server to recordedOracle.ts as the live oracle.
// Only the recorder loads this file; the specs never import the legacy server.
import { startLegacyOracle } from '../src/parity/legacyOracle.ts';
import { LIVE_ORACLE } from '../src/parity/recordedOracle.ts';

(globalThis as Record<symbol, unknown>)[LIVE_ORACLE] = startLegacyOracle;
