import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeftRight, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { childName } from '@/db/children'
import { listActiveLoanDetails, returnLoan, undoReturn, type LoanDetails } from '@/db/loans'
import { StoredToyImage } from '@/features/toys/ToyImage'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/utils'
import { LendDialog } from './LendDialog'
import { LoanTiming } from './LoanTiming'
import { isOverdue } from './loanTime'

/** How long the "returned – undo" message stays on screen. */
const UNDO_VISIBLE_MS = 8_000

/** What the message above the navigation is saying, if anything. */
type Notice =
  | { kind: 'returned'; loanId: string; toyName: string }
  | { kind: 'saveFailed' }
  | null

export function LoansPage() {
  const { t } = useTranslation()
  const loans = useLiveQuery(listActiveLoanDetails)
  const now = useNow()
  const [lendOpen, setLendOpen] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  // The message goes away by itself; a new one restarts the clock.
  useEffect(() => {
    if (!notice) {
      return
    }
    const timer = setTimeout(() => setNotice(null), UNDO_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [notice])

  async function onReturn({ loan, toy }: LoanDetails) {
    try {
      await returnLoan(loan.id)
      setNotice({ kind: 'returned', loanId: loan.id, toyName: toy?.name ?? t('loans.unknownToy') })
    } catch {
      setNotice({ kind: 'saveFailed' })
    }
  }

  async function onUndo(loanId: string) {
    try {
      await undoReturn(loanId)
      setNotice(null)
    } catch {
      setNotice({ kind: 'saveFailed' })
    }
  }

  const lendButton = (
    <Button size="lg" onClick={() => setLendOpen(true)}>
      <Plus aria-hidden />
      {t('loans.lend')}
    </Button>
  )

  return (
    <>
      <PageHeader title={t('loans.title')} action={lendButton} />

      {loans?.length === 0 && (
        <EmptyState
          icon={ArrowLeftRight}
          title={t('loans.emptyTitle')}
          text={t('loans.emptyText')}
        />
      )}

      {loans && loans.length > 0 && (
        <ul className="grid gap-2">
          {loans.map((details) => (
            <li key={details.loan.id}>
              <LoanRow details={details} now={now} onReturn={() => onReturn(details)} />
            </li>
          ))}
        </ul>
      )}

      <LendDialog open={lendOpen} onOpenChange={setLendOpen} />

      {/* Always present so that screen readers announce the message when it appears. */}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 px-4"
      >
        {notice && (
          <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-3 rounded-xl bg-foreground px-4 py-2 text-sm text-background shadow-lg">
            <span className="min-w-0 flex-1">
              {notice.kind === 'returned'
                ? t('loans.returned', { toy: notice.toyName })
                : t('common.saveFailed')}
            </span>
            {notice.kind === 'returned' && (
              <Button variant="secondary" onClick={() => onUndo(notice.loanId)}>
                {t('loans.undo')}
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function LoanRow({
  details: { loan, toy, child },
  now,
  onReturn,
}: {
  details: LoanDetails
  now: number
  onReturn: () => void
}) {
  const { t } = useTranslation()
  const overdue = isOverdue(loan, now)

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card p-2',
        overdue && 'border-destructive/40 bg-destructive/5',
      )}
    >
      <StoredToyImage toyId={toy?.id} className="size-14" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{toy?.name ?? t('loans.unknownToy')}</p>
        <p className="truncate text-sm">
          {child ? `${childName(child)} · ${child.className}` : t('loans.unknownChild')}
        </p>
        <LoanTiming loan={loan} now={now} />
        {loan.note && <p className="truncate text-sm text-muted-foreground">{loan.note}</p>}
      </div>
      <Button size="lg" variant="outline" onClick={onReturn}>
        {t('loans.return')}
      </Button>
    </div>
  )
}
