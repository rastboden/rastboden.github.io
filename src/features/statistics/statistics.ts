import type { Loan, Toy } from '@/db/schema'

export const periodKeys = ['week', 'month', 'quarter', 'year'] as const
export type PeriodKey = (typeof periodKeys)[number]

export type BucketUnit = 'day' | 'week' | 'month'

/**
 * How each period is cut into columns for the chart. Every period ends with
 * the bucket that contains "now": today, this week or this month.
 */
export const periods: Record<PeriodKey, { unit: BucketUnit; bucketCount: number }> = {
  week: { unit: 'day', bucketCount: 7 },
  month: { unit: 'day', bucketCount: 30 },
  quarter: { unit: 'week', bucketCount: 13 },
  year: { unit: 'month', bucketCount: 12 },
}

export interface Bucket {
  /** Inclusive, local time. */
  start: number
  /** Exclusive: the start of the next bucket. */
  end: number
  count: number
}

export interface ToyUsage {
  toy: Toy
  count: number
}

/**
 * Everything is counted per thing lent: three skipping ropes on one loan count
 * as three, the same as three loans of one rope each.
 */
export interface Statistics {
  loanCount: number
  /** Average time out for things that have been returned; `null` if none has. */
  averageDurationMs: number | null
  buckets: Bucket[]
  /** Toys lent at least once in the period, most lent first. Includes archived toys. */
  used: ToyUsage[]
  /** Toys in use (not archived) that were not lent in the period, by name. */
  unused: Toy[]
  /** How many of the toys in use were lent at least once. */
  usedToyCount: number
  /** How many toys are in use (not archived). */
  toyCount: number
}

/**
 * Start of the day, week (Monday) or month that contains `time`, moved by
 * `offset` whole units. Built from calendar fields so that daylight saving
 * changes do not shift the boundaries.
 */
function bucketStart(time: number, unit: BucketUnit, offset: number): number {
  const date = new Date(time)
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  if (unit === 'day') {
    return new Date(year, month, day + offset).getTime()
  }
  if (unit === 'week') {
    const daysSinceMonday = (date.getDay() + 6) % 7
    return new Date(year, month, day - daysSinceMonday + offset * 7).getTime()
  }
  return new Date(year, month + offset, 1).getTime()
}

/** When the period begins: the start of its first bucket. */
export function periodStart(period: PeriodKey, now: number): number {
  const { unit, bucketCount } = periods[period]
  return bucketStart(now, unit, -(bucketCount - 1))
}

export function computeStatistics(
  loans: Loan[],
  toys: Toy[],
  period: PeriodKey,
  now: number,
): Statistics {
  const { unit, bucketCount } = periods[period]
  const buckets: Bucket[] = Array.from({ length: bucketCount }, (_, index) => {
    const offset = index - (bucketCount - 1)
    return { start: bucketStart(now, unit, offset), end: bucketStart(now, unit, offset + 1), count: 0 }
  })

  const countByToy = new Map<string, number>()
  let loanCount = 0
  let returnedCount = 0
  let totalDurationMs = 0

  for (const loan of loans) {
    const bucket = buckets.find((candidate) => loan.lentAt >= candidate.start && loan.lentAt < candidate.end)
    if (!bucket) {
      continue
    }
    for (const item of loan.items) {
      bucket.count += item.quantity
      loanCount += item.quantity
      countByToy.set(item.toyId, (countByToy.get(item.toyId) ?? 0) + item.quantity)
      if (item.returnedAt !== null) {
        returnedCount += item.quantity
        totalDurationMs += item.quantity * (item.returnedAt - loan.lentAt)
      }
    }
  }

  const byName = (a: Toy, b: Toy) => a.name.localeCompare(b.name, 'sv')
  const toysInUse = toys.filter((toy) => toy.archivedAt === null)

  const used = toys
    .map((toy) => ({ toy, count: countByToy.get(toy.id) ?? 0 }))
    .filter((usage) => usage.count > 0)
    .sort((a, b) => b.count - a.count || byName(a.toy, b.toy))

  return {
    loanCount,
    averageDurationMs: returnedCount === 0 ? null : totalDurationMs / returnedCount,
    buckets,
    used,
    unused: toysInUse.filter((toy) => !countByToy.has(toy.id)).sort(byName),
    usedToyCount: toysInUse.filter((toy) => countByToy.has(toy.id)).length,
    toyCount: toysInUse.length,
  }
}

/** Rounds a chart's largest value up to an axis maximum whose midpoint is a whole number. */
export function niceAxisMax(value: number): number {
  if (value <= 10) {
    return Math.max(2, Math.ceil(value / 2) * 2)
  }
  const step = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / step) * step
}
