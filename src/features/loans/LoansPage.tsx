import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeftRight, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { childName } from '@/db/children'
import {
  listActiveLoanDetails,
  returnLoan,
  totalQuantity,
  undoReturn,
  type LoanDetails,
  type LoanLine,
} from '@/db/loans'
import { StoredToyImage } from '@/features/toys/ToyImage'
import { useNow } from '@/hooks/useNow'
import { LendDialog } from './LendDialog'
import { LoanTiming } from './LoanTiming'
import { describeLines } from './loanText'
import { ReturnDialog } from './ReturnDialog'
import { ToyQuantity } from './ToyQuantity'

/** How long the "returned – undo" message stays on screen. */
const UNDO_VISIBLE_MS = 8_000

/** What the message above the navigation is saying, if anything. */
type Notice =
  | { kind: 'returned'; loanId: string; returnedAt: number; items: string }
  | { kind: 'saveFailed' }
  | null

export function LoansPage() {
  const { t, i18n } = useTranslation()
  const loans = useLiveQuery(listActiveLoanDetails)
  const now = useNow()
  const [lendOpen, setLendOpen] = useState(false)
  // The loan stays set after the dialog closes, so the dialog keeps its content while it fades out.
  const [returnSomeOpen, setReturnSomeOpen] = useState(false)
  const [returnSomeFrom, setReturnSomeFrom] = useState<LoanDetails>()
  const [notice, setNotice] = useState<Notice>(null)

  // The message goes away by itself; a new one restarts the clock.
  useEffect(() => {
    if (!notice) {
      return
    }
    const timer = setTimeout(() => setNotice(null), UNDO_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [notice])

  /** Returns everything still out on the loan, or only `lines` when given. */
  async function onReturn({ loan, outstanding }: LoanDetails, lines?: LoanLine[]) {
    const returnedAt = Date.now()
    const returned = (lines ?? outstanding).map((line) => ({
      name:
        outstanding.find((candidate) => candidate.toyId === line.toyId)?.toy?.name ??
        t('loans.unknownToy'),
      quantity: line.quantity,
    }))
    try {
      await returnLoan(loan.id, returnedAt, lines)
      setNotice({
        kind: 'returned',
        loanId: loan.id,
        returnedAt,
        items: describeLines(returned, i18n.resolvedLanguage),
      })
    } catch {
      setNotice({ kind: 'saveFailed' })
    }
  }

  async function onUndo(loanId: string, returnedAt: number) {
    try {
      await undoReturn(loanId, returnedAt)
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
              <LoanCard
                details={details}
                now={now}
                onReturn={() => onReturn(details)}
                onReturnSome={() => {
                  setReturnSomeFrom(details)
                  setReturnSomeOpen(true)
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <LendDialog open={lendOpen} onOpenChange={setLendOpen} />
      <ReturnDialog
        open={returnSomeOpen}
        onOpenChange={setReturnSomeOpen}
        details={returnSomeFrom}
        onReturn={(lines) => {
          setReturnSomeOpen(false)
          if (returnSomeFrom) {
            void onReturn(returnSomeFrom, lines)
          }
        }}
      />

      {/* Always present so that screen readers announce the message when it appears. */}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 px-4"
      >
        {notice && (
          <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-3 rounded-xl bg-foreground px-4 py-2 text-sm text-background shadow-lg">
            <span className="min-w-0 flex-1">
              {notice.kind === 'returned'
                ? t('loans.returned', { items: notice.items })
                : t('common.saveFailed')}
            </span>
            {notice.kind === 'returned' && (
              <Button
                variant="secondary"
                onClick={() => onUndo(notice.loanId, notice.returnedAt)}
              >
                {t('loans.undo')}
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

/** One loan: who has it, for how long, and what is still out. */
function LoanCard({
  details: { loan, child, outstanding },
  now,
  onReturn,
  onReturnSome,
}: {
  details: LoanDetails
  now: number
  onReturn: () => void
  onReturnSome: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {child ? `${childName(child)} · ${child.className}` : t('loans.unknownChild')}
          </p>
          <LoanTiming lentAt={loan.lentAt} now={now} />
        </div>
        <Button size="lg" variant="outline" onClick={onReturn}>
          {t('loans.return')}
        </Button>
      </div>

      <ul className="mt-3 grid gap-2">
        {outstanding.map((line) => (
          <li key={line.toyId} className="flex items-center gap-3">
            <StoredToyImage toyId={line.toyId} className="size-12" />
            <span className="min-w-0 flex-1 truncate">
              <ToyQuantity toy={line.toy} quantity={line.quantity} />
            </span>
          </li>
        ))}
      </ul>

      {/* Only when there is more than one thing out; otherwise "some" is the same as all. */}
      {totalQuantity(outstanding) > 1 && (
        <Button
          variant="ghost"
          className="mt-1 -mb-1 -ml-2.5 h-11 text-muted-foreground"
          onClick={onReturnSome}
        >
          {t('loans.returnSome')}
        </Button>
      )}
    </div>
  )
}
