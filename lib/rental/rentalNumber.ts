/** Rental reference like R-2606-01. `count` = existing numbers this month. */
export function buildRentalNumber(count: number, date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `R-${yy}${mm}-${String(count + 1).padStart(2, "0")}`;
}
