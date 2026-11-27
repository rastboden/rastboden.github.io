import type { Loan } from '@/db/schema'

/**
 * The time to count from for a loan that is still out. The shared clock only
 * ticks now and then, so it can be slightly behind a loan made just now.
 */
export function effectiveNow(loan: Loan, clockNow: number): number {
  return Math.max(clockNow, loan.lentAt)
}

export function isOverdue(loan: Loan, clockNow: number): boolean {
  return loan.dueAt !== null && effectiveNow(loan, clockNow) > loan.dueAt
}
