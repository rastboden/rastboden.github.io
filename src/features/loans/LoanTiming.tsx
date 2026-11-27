import { useTranslation } from 'react-i18next'
import type { Loan } from '@/db/schema'
import { formatDuration } from '@/lib/formatDuration'
import { cn } from '@/lib/utils'
import { effectiveNow, isOverdue } from './loanTime'

/** Two lines for a loan that is still out: how long it has been out, and how it stands against its time limit. */
export function LoanTiming({ loan, now: clockNow }: { loan: Loan; now: number }) {
  const { t } = useTranslation()
  const now = effectiveNow(loan, clockNow)
  const overdue = isOverdue(loan, clockNow)

  return (
    <>
      <p className="truncate text-sm text-muted-foreground">
        {t('loans.lentFor', { duration: formatDuration(now - loan.lentAt, t) })}
      </p>
      {loan.dueAt !== null && (
        <p
          className={cn(
            'truncate text-sm',
            overdue ? 'font-medium text-destructive' : 'text-muted-foreground',
          )}
        >
          {overdue
            ? t('loans.overdue', { duration: formatDuration(now - loan.dueAt, t) })
            : t('loans.timeLeft', { duration: formatDuration(loan.dueAt - now, t, 'up') })}
        </p>
      )}
    </>
  )
}
