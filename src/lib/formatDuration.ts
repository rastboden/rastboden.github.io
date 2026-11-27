import type { TFunction } from 'i18next'
import { splitDuration } from './time'

/** A length of time as short text in the current language, e.g. "12 min" or "1 tim 5 min". */
export function formatDuration(
  milliseconds: number,
  t: TFunction,
  rounding: 'down' | 'up' = 'down',
): string {
  const { hours, minutes } = splitDuration(milliseconds, rounding)
  if (hours === 0) {
    return t('time.minutes', { minutes })
  }
  if (minutes === 0) {
    return t('time.hours', { hours })
  }
  return t('time.hoursMinutes', { hours, minutes })
}
