import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Pencil } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { childName, getChild } from '@/db/children'
import { listLoanLinesForChild, totalQuantity, type ChildLoanLine } from '@/db/loans'
import { LoanTiming } from '@/features/loans/LoanTiming'
import { ToyQuantity } from '@/features/loans/ToyQuantity'
import { StoredToyImage } from '@/features/toys/ToyImage'
import { useNow } from '@/hooks/useNow'
import { dateLocale } from '@/lib/dateLocale'
import { formatDuration } from '@/lib/formatDuration'
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
      return { child: undefined, lines: [] }
    }
    return { child: await getChild(childId), lines: await listLoanLinesForChild(childId) }
  }, [childId])

  if (!data) {
    return null
  }
  // An unknown id, or a child that has just been archived from this page.
  if (!data.child || data.child.archivedAt !== null) {
    return <Navigate to="/children" replace />
  }

  // One row per toy on a loan. Part of a loan can be back while the rest is still out.
  const { child, lines } = data
  const current = lines.filter((line) => line.returnedAt === null)
  const history = lines.filter((line) => line.returnedAt !== null)
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
          count={totalQuantity(current)}
          emptyText={t('children.noCurrentLoans')}
        >
          {current.map((line) => (
            <LoanItem key={lineKey(line)} line={line}>
              <LoanTiming lentAt={line.lentAt} now={now} />
            </LoanItem>
          ))}
        </LoanSection>

        <LoanSection
          title={t('children.history')}
          count={totalQuantity(history)}
          emptyText={t('children.noHistory')}
        >
          {history.slice(0, historyShown).map((line) => (
            <LoanItem key={lineKey(line)} line={line}>
              <p className="truncate text-sm text-muted-foreground">
                {dateTime.format(line.lentAt)}
                {' · '}
                {formatDuration(timeOut(line), t)}
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

/** How long something that has been returned was out. */
function timeOut(line: ChildLoanLine): number {
  return (line.returnedAt ?? line.lentAt) - line.lentAt
}

/** A loan never has the same toy twice with the same return time, so this is unique. */
function lineKey(line: ChildLoanLine): string {
  return `${line.loanId}:${line.toyId}:${line.returnedAt}`
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

function LoanItem({ line, children }: { line: ChildLoanLine; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card p-2">
      <StoredToyImage toyId={line.toyId} className="size-12" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          <ToyQuantity toy={line.toy} quantity={line.quantity} />
        </p>
        {children}
      </div>
    </li>
  )
}
