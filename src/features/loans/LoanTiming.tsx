import { useTranslation } from 'react-i18next'
import { formatDuration } from '@/lib/formatDuration'
import { effectiveNow } from './loanTime'

/** How long something that is still out has been out. */
export function LoanTiming({ lentAt, now }: { lentAt: number; now: number }) {
  const { t } = useTranslation()

  return (
    <p className="truncate text-sm text-muted-foreground">
      {t('loans.lentFor', { duration: formatDuration(effectiveNow(lentAt, now) - lentAt, t) })}
    </p>
  )
}
