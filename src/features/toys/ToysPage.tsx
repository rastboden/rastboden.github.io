import { useLiveQuery } from 'dexie-react-hooks'
import { Blocks, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { listActiveLoans } from '@/db/loans'
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

  const lentToyIds = new Set(activeLoans?.map((loan) => loan.toyId))

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
                lent={lentToyIds.has(toy.id)}
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

function ToyRow({ toy, lent, onSelect }: { toy: Toy; lent: boolean; onSelect: () => void }) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl border bg-card p-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <StoredToyImage toyId={toy.id} className="size-14" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{toy.name}</span>
        {toy.category && (
          <span className="block truncate text-sm text-muted-foreground">{toy.category}</span>
        )}
      </span>
      {lent && (
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {t('toys.lent')}
        </span>
      )}
    </button>
  )
}
