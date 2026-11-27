import { describe, expect, it } from 'vitest'
import type { Loan, Toy } from '@/db/schema'
import { computeStatistics, niceAxisMax, periodStart } from './statistics'

// Friday 27 November 2026, 12:00 local time.
const now = new Date(2026, 10, 27, 12).getTime()
const at = (year: number, month: number, day: number, hour = 10) =>
  new Date(year, month - 1, day, hour).getTime()
const minutes = (count: number) => count * 60_000

function toy(id: string, name: string, archivedAt: number | null = null): Toy {
  return { id, name, category: '', note: '', createdAt: 0, archivedAt }
}

let nextLoanId = 0
function loan(toyId: string, lentAt: number, minutesOut: number | null = null): Loan {
  nextLoanId += 1
  return {
    id: `loan-${nextLoanId}`,
    toyId,
    childId: 'child-1',
    lentAt,
    dueAt: null,
    returnedAt: minutesOut === null ? null : lentAt + minutes(minutesOut),
    note: '',
  }
}

describe('periodStart', () => {
  it('starts the 7-day period six days before today, at midnight', () => {
    expect(periodStart('week', now)).toBe(at(2026, 11, 21, 0))
  })

  it('starts the 13-week period on a Monday', () => {
    const start = new Date(periodStart('quarter', now))
    expect(start.getDay()).toBe(1)
    expect(start.getTime()).toBe(at(2026, 8, 31, 0))
  })

  it('starts the 12-month period on the first of the month, eleven months back', () => {
    expect(periodStart('year', now)).toBe(at(2025, 12, 1, 0))
  })
})

describe('computeStatistics', () => {
  const ball = toy('ball', 'Boll')
  const rope = toy('rope', 'Hopprep')
  const cart = toy('cart', 'Kärra')
  const oldDoll = toy('doll', 'Docka', at(2026, 11, 25))

  it('counts loans per day and leaves out loans from before the period', () => {
    const stats = computeStatistics(
      [
        loan('ball', at(2026, 11, 27, 9)),
        loan('ball', at(2026, 11, 27, 11)),
        loan('rope', at(2026, 11, 21, 0)),
        loan('rope', at(2026, 11, 20, 23)),
      ],
      [ball, rope],
      'week',
      now,
    )

    expect(stats.loanCount).toBe(3)
    expect(stats.buckets.map((bucket) => bucket.count)).toEqual([1, 0, 0, 0, 0, 0, 2])
  })

  it('groups a year into calendar months', () => {
    const stats = computeStatistics(
      [loan('ball', at(2025, 12, 1, 0)), loan('ball', at(2026, 10, 31, 23)), loan('ball', at(2026, 11, 1, 0))],
      [ball],
      'year',
      now,
    )

    const counts = stats.buckets.map((bucket) => bucket.count)
    expect(counts).toHaveLength(12)
    expect(counts[0]).toBe(1)
    expect(counts.slice(-2)).toEqual([1, 1])
  })

  it('ranks used toys by number of loans, then by name', () => {
    const stats = computeStatistics(
      [
        loan('rope', at(2026, 11, 26)),
        loan('cart', at(2026, 11, 26)),
        loan('ball', at(2026, 11, 25)),
        loan('ball', at(2026, 11, 26)),
      ],
      [cart, rope, ball],
      'week',
      now,
    )

    expect(stats.used.map((usage) => [usage.toy.name, usage.count])).toEqual([
      ['Boll', 2],
      ['Hopprep', 1],
      ['Kärra', 1],
    ])
  })

  it('lists toys in use that were not lent, and keeps archived toys out of that list', () => {
    const stats = computeStatistics(
      [loan('ball', at(2026, 11, 26)), loan('doll', at(2026, 11, 24))],
      [rope, ball, cart, oldDoll],
      'week',
      now,
    )

    expect(stats.unused.map((unused) => unused.name)).toEqual(['Hopprep', 'Kärra'])
    // The archived doll was lent before it was archived, so it still shows as used.
    expect(stats.used.map((usage) => usage.toy.name)).toEqual(['Boll', 'Docka'])
    expect([stats.usedToyCount, stats.toyCount]).toEqual([1, 3])
  })

  it('averages the time out over returned loans only', () => {
    const stats = computeStatistics(
      [
        loan('ball', at(2026, 11, 26), 10),
        loan('ball', at(2026, 11, 26), 30),
        loan('rope', at(2026, 11, 27)),
      ],
      [ball, rope],
      'week',
      now,
    )

    expect(stats.averageDurationMs).toBe(minutes(20))
  })

  it('has no average when nothing has been returned', () => {
    const stats = computeStatistics([loan('ball', at(2026, 11, 26))], [ball], 'week', now)

    expect(stats.averageDurationMs).toBeNull()
  })
})

describe('niceAxisMax', () => {
  it('gives small values an even maximum, so the midpoint is a whole number', () => {
    expect([0, 1, 2, 3, 7, 10].map(niceAxisMax)).toEqual([2, 2, 2, 4, 8, 10])
  })

  it('rounds larger values up to a round number', () => {
    expect([11, 37, 100, 101, 250].map(niceAxisMax)).toEqual([20, 40, 100, 200, 300])
  })
})
