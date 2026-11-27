import { useLiveQuery } from 'dexie-react-hooks'
import { ChartColumn } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { listLoansSince } from '@/db/loans'
import type { Toy } from '@/db/schema'
import { listAllToys } from '@/db/toys'
import { StoredToyImage } from '@/features/toys/ToyImage'
import { useNow } from '@/hooks/useNow'
import { formatDuration } from '@/lib/formatDuration'
import { axisLabel, fullLabel } from './bucketLabels'
import { ColumnChart, type Column } from './ColumnChart'
import {
  computeStatistics,
  periodKeys,
  periods,
  periodStart,
  type PeriodKey,
  type Statistics,
  type ToyUsage,
} from './statistics'

/** Rows shown in a list before "show all" is needed. */
const LIST_LIMIT = 8

/** Label every n-th column, counted from the newest, so the labels have room on a phone. */
const AXIS_LABEL_EVERY: Record<PeriodKey, number> = { week: 1, month: 7, quarter: 4, year: 2 }

export function StatisticsPage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<PeriodKey>('month')
  // Only used to find which day it is, so a slow tick is enough.
  const now = useNow(60_000)
  const from = periodStart(period, now)

  const data = useLiveQuery(
    async () => ({ loans: await listLoansSince(from), toys: await listAllToys() }),
    [from],
  )
  const statistics = data && computeStatistics(data.loans, data.toys, period, now)

  return (
    <>
      <PageHeader title={t('statistics.title')} />

      {/* One filter row; everything below it is for the chosen period. */}
      <div role="group" aria-label={t('statistics.period')} className="mb-4 grid grid-cols-4 gap-2">
        {periodKeys.map((key) => (
          <Button
            key={key}
            size="lg"
            variant={period === key ? 'default' : 'outline'}
            aria-pressed={period === key}
            onClick={() => setPeriod(key)}
          >
            {t(`statistics.periods.${key}`)}
          </Button>
        ))}
      </div>

      {statistics?.loanCount === 0 && (
        <EmptyState
          icon={ChartColumn}
          title={t('statistics.emptyTitle')}
          text={t('statistics.emptyText')}
        />
      )}

      {statistics && statistics.loanCount > 0 && (
        <div className="grid gap-4">
          <Summary statistics={statistics} />
          <LoansOverTime statistics={statistics} period={period} />
          <MostUsed used={statistics.used} />
          <Unused toys={statistics.unused} />
        </div>
      )}
    </>
  )
}

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="font-medium">{title}</h2>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Summary({ statistics }: { statistics: Statistics }) {
  const { t } = useTranslation()
  const tiles = [
    { label: t('statistics.loans'), value: String(statistics.loanCount) },
    {
      label: t('statistics.toysUsed'),
      value: t('statistics.toysUsedValue', {
        used: statistics.usedToyCount,
        total: statistics.toyCount,
      }),
    },
    {
      label: t('statistics.averageTime'),
      value:
        statistics.averageDurationMs === null
          ? t('statistics.noValue')
          : formatDuration(statistics.averageDurationMs, t),
    },
  ]

  return (
    <dl className="grid grid-cols-3 gap-2">
      {tiles.map((tile) => (
        <div key={tile.label} className="flex flex-col-reverse justify-between gap-1 rounded-xl border bg-card p-3">
          <dd className="text-xl font-semibold tracking-tight">{tile.value}</dd>
          <dt className="text-xs text-muted-foreground">{tile.label}</dt>
        </div>
      ))}
    </dl>
  )
}

function LoansOverTime({ statistics, period }: { statistics: Statistics; period: PeriodKey }) {
  const { t, i18n } = useTranslation()
  const { unit } = periods[period]
  const language = i18n.resolvedLanguage ?? 'sv'
  const lastIndex = statistics.buckets.length - 1

  const columns: Column[] = statistics.buckets.map((bucket, index) => ({
    key: String(bucket.start),
    axisLabel:
      (lastIndex - index) % AXIS_LABEL_EVERY[period] === 0
        ? axisLabel(bucket, period, language)
        : null,
    fullLabel: fullLabel(bucket, unit, language),
    value: bucket.count,
    valueText: t('statistics.loanCount', { count: bucket.count }),
  }))

  const note = { day: t('statistics.perDay'), week: t('statistics.perWeek'), month: t('statistics.perMonth') }

  return (
    <Card title={t('statistics.loansOverTime')} note={note[unit]}>
      <ColumnChart columns={columns} />
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer py-1 text-muted-foreground">
          {t('statistics.showTable')}
        </summary>
        <table className="mt-2 w-full">
          <thead className="sr-only">
            <tr>
              <th scope="col">{t('statistics.period')}</th>
              <th scope="col">{t('statistics.loans')}</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column) => (
              <tr key={column.key} className="border-t">
                <th scope="row" className="py-1.5 text-left font-normal">
                  {column.fullLabel}
                </th>
                <td className="py-1.5 text-right tabular-nums">{column.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  )
}

/** Shows the first rows of a list, with a button to show the rest. */
function CappedList<T>({
  items,
  children,
}: {
  items: T[]
  children: (visible: T[]) => ReactNode
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, LIST_LIMIT)

  return (
    <>
      {children(visible)}
      {items.length > LIST_LIMIT && (
        <Button
          variant="ghost"
          className="mt-2 w-full"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? t('statistics.showFewer') : t('statistics.showAll', { count: items.length })}
        </Button>
      )}
    </>
  )
}

function toyLabel(toy: Toy, archivedText: string): string {
  return toy.archivedAt === null ? toy.name : `${toy.name} (${archivedText})`
}

function MostUsed({ used }: { used: ToyUsage[] }) {
  const { t } = useTranslation()
  const largest = used[0]?.count ?? 0

  return (
    <Card title={t('statistics.mostUsed')}>
      <CappedList items={used}>
        {(visible) => (
          <ol className="grid gap-3">
            {visible.map(({ toy, count }) => (
              <li key={toy.id} className="flex items-center gap-3">
                <StoredToyImage toyId={toy.id} className="size-9" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm">{toyLabel(toy, t('statistics.archived'))}</span>
                    <span className="text-sm font-medium tabular-nums">{count}</span>
                  </div>
                  {/* Starts square at the left baseline; only the data end is rounded. */}
                  <div
                    aria-hidden
                    className="mt-1 h-2 rounded-r-[4px] bg-chart-1"
                    style={{ width: `max(2px, ${(count / largest) * 100}%)` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CappedList>
    </Card>
  )
}

function Unused({ toys }: { toys: Toy[] }) {
  const { t } = useTranslation()

  return (
    <Card
      title={t('statistics.unused')}
      note={toys.length === 0 ? t('statistics.allUsed') : t('statistics.unusedText')}
    >
      <CappedList items={toys}>
        {(visible) => (
          <ul className="grid gap-2">
            {visible.map((toy) => (
              <li key={toy.id} className="flex items-center gap-3">
                <StoredToyImage toyId={toy.id} className="size-9" />
                <span className="truncate text-sm">{toy.name}</span>
              </li>
            ))}
          </ul>
        )}
      </CappedList>
    </Card>
  )
}
