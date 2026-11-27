import { useLiveQuery } from 'dexie-react-hooks'
import { Blocks, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { listActiveLoans, outstandingLines } from '@/db/loans'
import type { Toy } from '@/db/schema'
import { listToys } from '@/db/toys'
import { ToyDialog } from './ToyDialog'
import { StoredToyImage } from './ToyImage'

/** Which dialog is showing: none, the one for a new toy, or the one editing a toy. */
type DialogState = { kind: 'closed' } | { kind: 'add' } | { kind: 'edit'; toy: Toy }

export function ToysPage() {
  const { t } = useTranslation()
  const toys = useLiveQuery(listToys)
  const activeLoans = useLiveQuery(listActiveLoans)
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' })

  // How many of each toy are out right now; a toy can be on loan to several children at once.
  const lentCounts = new Map<string, number>()
  for (const line of (activeLoans ?? []).flatMap(outstandingLines)) {
    lentCounts.set(line.toyId, (lentCounts.get(line.toyId) ?? 0) + line.quantity)
  }

  const addButton = (
    <Button size="lg" onClick={() => setDialog({ kind: 'add' })}>
      <Plus aria-hidden />
      {t('common.add')}
    </Button>
  )

  return (
    <>
      <PageHeader title={t('toys.title')} action={addButton} />

      {toys?.length === 0 && (
        <EmptyState icon={Blocks} title={t('toys.emptyTitle')} text={t('toys.emptyText')} />
      )}

      {toys && toys.length > 0 && (
        <ul className="grid gap-2">
          {toys.map((toy) => (
            <li key={toy.id}>
              <ToyRow
                toy={toy}
                lentCount={lentCounts.get(toy.id) ?? 0}
                onSelect={() => setDialog({ kind: 'edit', toy })}
              />
            </li>
          ))}
        </ul>
      )}

      <ToyDialog
        open={dialog.kind !== 'closed'}
        onOpenChange={(open) => {
          if (!open) {
            setDialog({ kind: 'closed' })
          }
        }}
        toy={dialog.kind === 'edit' ? dialog.toy : undefined}
      />
    </>
  )
}

function ToyRow({
  toy,
  lentCount,
  onSelect,
}: {
  toy: Toy
  lentCount: number
  onSelect: () => void
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl border bg-card p-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <StoredToyImage toyId={toy.id} className="size-14" />
      <span className="min-w-0 flex-1 truncate font-medium">{toy.name}</span>
      {lentCount > 0 && (
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {t('toys.lent', { count: lentCount })}
        </span>
      )}
    </button>
  )
}
