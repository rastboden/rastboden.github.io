import { dateLocale } from '@/lib/dateLocale'
import type { Bucket, BucketUnit, PeriodKey } from './statistics'

const DAY = 24 * 60 * 60 * 1000

/** Short text under a column. Kept very short: on a phone a column is a few pixels wide. */
export function axisLabel(bucket: Bucket, period: PeriodKey, language: string): string {
  const options: Record<PeriodKey, Intl.DateTimeFormatOptions> = {
    week: { weekday: 'short' },
    month: { day: 'numeric', month: 'numeric' },
    quarter: { day: 'numeric', month: 'short' },
    year: { month: 'short' },
  }
  return new Intl.DateTimeFormat(dateLocale(language), options[period]).format(bucket.start)
}

/** Full text for the tooltip and the table, e.g. "fredag 27 november" or "23–29 nov. 2026". */
export function fullLabel(bucket: Bucket, unit: BucketUnit, language: string): string {
  const locale = dateLocale(language)
  if (unit === 'day') {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(bucket.start)
  }
  if (unit === 'week') {
    // A point inside the week's last day; `end` itself belongs to the next week.
    const lastDay = bucket.end - DAY / 2
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).formatRange(bucket.start, lastDay)
  }
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(bucket.start)
}
