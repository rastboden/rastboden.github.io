import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Pencil } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { childName, getChild } from '@/db/children'
import { listLoansForChild } from '@/db/loans'
import type { Loan, Toy } from '@/db/schema'
import { LoanTiming } from '@/features/loans/LoanTiming'
import { isOverdue } from '@/features/loans/loanTime'
import { StoredToyImage } from '@/features/toys/ToyImage'
import { useNow } from '@/hooks/useNow'
import { dateLocale } from '@/lib/dateLocale'
import { formatDuration } from '@/lib/formatDuration'
import { cn } from '@/lib/utils'
import { ChildDialog } from './ChildDialog'

/** How many history rows are shown at first, and how many each "show more" adds. */
const HISTORY_STEP = 30

/** One child: what they have out right now, and everything they have borrowed before. */
export function ChildPage() {
  const { childId } = useParams()
  const { t, i18n } = useTranslation()
  const now = useNow()
  const [editOpen, setEditOpen] = useState(false)
  const [historyShown, setHistoryShown] = useState(HISTORY_STEP)

  const data = useLiveQuery(async () => {
    if (!childId) {
      return { child: undefined, loans: [] }
    }
    return { child: await getChild(childId), loans: await listLoansForChild(childId) }
  }, [childId])

  if (!data) {
    return null
  }
  // An unknown id, or a child that has just been archived from this page.
  if (!data.child || data.child.archivedAt !== null) {
    return <Navigate to="/children" replace />
  }

  const { child, loans } = data
  const current = loans.filter(({ loan }) => loan.returnedAt === null)
  const history = loans.filter(({ loan }) => loan.returnedAt !== null)
  const dateTime = new Intl.DateTimeFormat(dateLocale(i18n.resolvedLanguage), {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <>
      <Link
        to="/children"
        className="-ml-1 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t('children.title')}
      </Link>
      <PageHeader
        title={childName(child)}
        action={
          <Button size="lg" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil aria-hidden />
            {t('common.edit')}
          </Button>
        }
      />
      <p className="-mt-3 mb-6 text-muted-foreground">
        {t('children.className')} {child.className}
      </p>

      <div className="grid gap-6">
        <LoanSection
          title={t('children.currentLoans')}
          count={current.length}
          emptyText={t('children.noCurrentLoans')}
        >
          {current.map(({ loan, toy }) => (
            <LoanItem key={loan.id} toy={toy} overdue={isOverdue(loan, now)}>
              <LoanTiming loan={loan} now={now} />
            </LoanItem>
          ))}
        </LoanSection>

        <LoanSection
          title={t('children.history')}
          count={history.length}
          emptyText={t('children.noHistory')}
        >
          {history.slice(0, historyShown).map(({ loan, toy }) => (
            <LoanItem key={loan.id} toy={toy}>
              <p className="truncate text-sm text-muted-foreground">
                {dateTime.format(loan.lentAt)}
                {' · '}
                {formatDuration(timeOut(loan), t)}
              </p>
            </LoanItem>
          ))}
        </LoanSection>
        {history.length > historyShown && (
          <Button
            variant="ghost"
            className="-mt-4 w-full"
            onClick={() => setHistoryShown(historyShown + HISTORY_STEP)}
          >
            {t('common.showMore')}
          </Button>
        )}
      </div>

      <ChildDialog open={editOpen} onOpenChange={setEditOpen} child={child} />
    </>
  )
}

/** How long a returned loan was out. */
function timeOut(loan: Loan): number {
  return (loan.returnedAt ?? loan.lentAt) - loan.lentAt
}

function LoanSection({
  title,
  count,
  emptyText,
  children,
}: {
  title: string
  count: number
  emptyText: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-baseline gap-2 text-sm font-medium text-muted-foreground">
        {title}
        <span className="font-normal">{count}</span>
      </h2>
      {count === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="grid gap-2">{children}</ul>
      )}
    </section>
  )
}

function LoanItem({
  toy,
  overdue = false,
  children,
}: {
  toy: Toy | undefined
  overdue?: boolean
  children: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card p-2',
        overdue && 'border-destructive/40 bg-destructive/5',
      )}
    >
      <StoredToyImage toyId={toy?.id} className="size-12" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{toy?.name ?? t('loans.unknownToy')}</p>
        {children}
      </div>
    </li>
  )
}
