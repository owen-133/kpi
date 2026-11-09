const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// "접수 후 …" label for the time between receipt and now: days+hours from one day on,
// hours+minutes under a day, minutes under an hour. Empty when either time is unusable or receipt is in the future.
export function elapsedSinceReceipt(receivedAt: string | null | undefined, now: string): string {
  const from = Date.parse(receivedAt ?? '');
  const to = Date.parse(now);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return '';
  const span = to - from;
  if (span >= DAY_MS) return `접수 후 ${Math.floor(span / DAY_MS)}일 ${Math.floor((span % DAY_MS) / HOUR_MS)}시간`;
  if (span >= HOUR_MS) return `접수 후 ${Math.floor(span / HOUR_MS)}시간 ${Math.floor((span % HOUR_MS) / MINUTE_MS)}분`;
  return `접수 후 ${Math.floor(span / MINUTE_MS)}분`;
}
