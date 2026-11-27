import { useLiveQuery } from 'dexie-react-hooks'
import { FileSpreadsheet, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { childName, listChildren } from '@/db/children'
import type { Child } from '@/db/schema'
import { ChildDialog } from './ChildDialog'
import { ImportDialog } from './ImportDialog'

/** Which dialog is showing: none, the one for a new child, or the one editing a child. */
type DialogState = { kind: 'closed' } | { kind: 'add' } | { kind: 'edit'; child: Child }

/** Groups children by class, keeping the order they arrive in (class, then name). */
function groupByClass(children: Child[]): { className: string; children: Child[] }[] {
  const groups: { className: string; children: Child[] }[] = []
  for (const child of children) {
    const last = groups.at(-1)
    if (last && last.className === child.className) {
      last.children.push(child)
    } else {
      groups.push({ className: child.className, children: [child] })
    }
  }
  return groups
}

export function ChildrenPage() {
  const { t } = useTranslation()
  const children = useLiveQuery(listChildren)
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' })
  const [importOpen, setImportOpen] = useState(false)
  // A new child starts in the class of the one added last, so a whole class can be entered quickly.
  const newestChild = children?.reduce<Child | undefined>(
    (newest, child) => (!newest || child.createdAt > newest.createdAt ? child : newest),
    undefined,
  )

  const actions = (
    <div className="flex gap-2">
      <Button size="lg" variant="outline" onClick={() => setImportOpen(true)}>
        <FileSpreadsheet aria-hidden />
        {t('children.import')}
      </Button>
      <Button size="lg" onClick={() => setDialog({ kind: 'add' })}>
        <Plus aria-hidden />
        {t('common.add')}
      </Button>
    </div>
  )

  return (
    <>
      <PageHeader title={t('children.title')} action={actions} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {children?.length === 0 && (
        <EmptyState icon={Users} title={t('children.emptyTitle')} text={t('children.emptyText')} />
      )}

      {children && children.length > 0 && (
        <div className="grid gap-5">
          {groupByClass(children).map((group) => (
            <section key={group.className} aria-label={group.className}>
              <h2
                className="mb-2 flex items-baseline gap-2 text-sm font-medium text-muted-foreground"
              >
                {group.className}
                <span className="font-normal">{group.children.length}</span>
              </h2>
              <ul className="overflow-hidden rounded-xl border bg-card">
                {group.children.map((child) => (
                  <li key={child.id} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: 'edit', child })}
                      className="flex min-h-12 w-full items-center px-3 text-left outline-none hover:bg-muted focus-visible:bg-muted"
                    >
                      <span className="truncate">{childName(child)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ChildDialog
        open={dialog.kind !== 'closed'}
        onOpenChange={(open) => {
          if (!open) {
            setDialog({ kind: 'closed' })
          }
        }}
        child={dialog.kind === 'edit' ? dialog.child : undefined}
        defaultClassName={newestChild?.className}
      />
    </>
  )
}
