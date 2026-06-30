// Pure rental pricing. No timezone dependence: parse YYYY-MM-DD as UTC noon
// so day-count is stable regardless of the machine's offset.

function toUtcDays(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.floor(ms / 86_400_000);
}

/** Calendar days between start and end (inclusive of at least 1). 0 if input invalid. */
export function rentalDays(start: string, end: string): number {
  const a = toUtcDays(start);
  const b = toUtcDays(end);
  if (a === null || b === null) return 0;
  return Math.max(1, b - a);
}

/** days × dailyRate, clamped at 0. */
export function rentalTotal(days: number, dailyRate: number): number {
  if (!Number.isFinite(days) || !Number.isFinite(dailyRate)) return 0;
  if (days <= 0 || dailyRate <= 0) return 0;
  return days * dailyRate;
}
