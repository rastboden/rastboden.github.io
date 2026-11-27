/**
 * The time to count from for a loan that is still out. The shared clock only
 * ticks now and then, so it can be slightly behind a loan made just now.
 */
export function effectiveNow(lentAt: number, clockNow: number): number {
  return Math.max(clockNow, lentAt)
}
