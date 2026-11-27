import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, FileSpreadsheet, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { childName, listChildren } from '@/db/children'
import type { Child } from '@/db/schema'
import { ChildDialog } from './ChildDialog'
import { ImportDialog } from './ImportDialog'

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
  const [addOpen, setAddOpen] = useState(false)
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
      <Button size="lg" onClick={() => setAddOpen(true)}>
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
              <h2 className="mb-2 flex items-baseline gap-2 text-sm font-medium text-muted-foreground">
                {group.className}
                <span className="font-normal">{group.children.length}</span>
              </h2>
              <ul className="overflow-hidden rounded-xl border bg-card">
                {group.children.map((child) => (
                  <li key={child.id} className="border-b last:border-b-0">
                    {/* Opens the child's own page, with their loans; editing is done from there. */}
                    <Link
                      to={`/children/${child.id}`}
                      className="flex min-h-12 w-full items-center gap-2 px-3 outline-none hover:bg-muted focus-visible:bg-muted"
                    >
                      <span className="min-w-0 flex-1 truncate">{childName(child)}</span>
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ChildDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultClassName={newestChild?.className}
      />
    </>
  )
}
