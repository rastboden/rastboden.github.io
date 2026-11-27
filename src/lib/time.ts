const MINUTE = 60_000

/**
 * Splits a length of time into whole hours and minutes. Negative lengths count
 * as zero. Round up for time remaining, so "2 min 10 s left" reads as 3 min,
 * and down for time passed.
 */
export function splitDuration(
  milliseconds: number,
  rounding: 'down' | 'up' = 'down',
): { hours: number; minutes: number } {
  const exactMinutes = Math.max(0, milliseconds) / MINUTE
  const totalMinutes = rounding === 'up' ? Math.ceil(exactMinutes) : Math.floor(exactMinutes)
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 }
}

export function minutesToMilliseconds(minutes: number): number {
  return minutes * MINUTE
}
