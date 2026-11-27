import { useLiveQuery } from 'dexie-react-hooks'
import { FileSpreadsheet } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useOpeningKey } from '@/components/useOpeningKey'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createChildren, listChildren, type ChildInput } from '@/db/children'
import { planImport, type ColumnKey, type ParsedClassList } from './classList'
import { readClassListFile } from './classListFile'
import { ExampleFileButton } from './ExampleFileButton'

/** Rows with problems listed before the rest are summed up as "and N more". */
const PROBLEMS_SHOWN = 5

/** Where the dialog is: waiting for a file, reading it, or showing what was found. */
type Stage =
  | { kind: 'choose' }
  | { kind: 'reading' }
  | { kind: 'unreadable' }
  | { kind: 'parsed'; result: ParsedClassList }

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const openingKey = useOpeningKey(open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t('common.close')}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{t('children.importTitle')}</DialogTitle>
          <DialogDescription>{t('children.importIntro')}</DialogDescription>
        </DialogHeader>
        {/* A new key for every opening, so the steps always start fresh. */}
        <ImportSteps key={openingKey} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ImportSteps({ onDone }: { onDone: () => void }) {
  const { t, i18n } = useTranslation()
  const fileInput = useRef<HTMLInputElement>(null)
  const existing = useLiveQuery(listChildren)
  const [stage, setStage] = useState<Stage>({ kind: 'choose' })
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  async function onPickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Clear the input so picking the same file again still fires a change.
    event.target.value = ''
    if (!file) {
      return
    }
    setStage({ kind: 'reading' })
    setSaveFailed(false)
    try {
      setStage({ kind: 'parsed', result: await readClassListFile(file) })
    } catch {
      setStage({ kind: 'unreadable' })
    }
  }

  async function onImport(children: ChildInput[]) {
    setSaving(true)
    try {
      await createChildren(children)
      onDone()
    } catch {
      setSaveFailed(true)
      setSaving(false)
    }
  }

  const columnLabel: Record<ColumnKey, string> = {
    firstName: t('children.firstName'),
    lastName: t('children.lastName'),
    className: t('children.className'),
  }

  const parsed = stage.kind === 'parsed' ? stage.result : undefined
  const found = parsed?.kind === 'ok' ? parsed : undefined
  // Worked out from the file and the current list each time, so it is never out of date.
  const plan = found && existing ? planImport(found.children, existing) : undefined

  const chooseFile = (
    <Button
      type="button"
      size="lg"
      variant={plan ? 'outline' : 'default'}
      disabled={stage.kind === 'reading' || saving}
      onClick={() => fileInput.current?.click()}
    >
      <FileSpreadsheet aria-hidden />
      {stage.kind === 'choose' ? t('children.chooseFile') : t('children.chooseAnother')}
    </Button>
  )

  return (
    <div className="grid gap-4">
      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onPickFile}
      />

      <div aria-live="polite" className="grid gap-3 text-sm empty:hidden">
        {stage.kind === 'reading' && <p>{t('children.reading')}</p>}

        {stage.kind === 'unreadable' && (
          <p className="text-destructive">{t('children.unreadable')}</p>
        )}

        {parsed?.kind === 'empty' && <p className="text-destructive">{t('children.emptyFile')}</p>}

        {parsed?.kind === 'missingColumns' && (
          <p className="text-destructive">
            {t('children.missingColumns', {
              count: parsed.missing.length,
              // "Förnamn och Klass" / "First name and Class", in the app's language.
              columns: new Intl.ListFormat(i18n.resolvedLanguage, { type: 'conjunction' }).format(
                parsed.missing.map((key) => columnLabel[key]),
              ),
            })}
          </p>
        )}

        {found && plan && (
          <>
            {plan.toAdd.length > 0 ? (
              <div>
                <p className="text-base font-medium">
                  {t('children.willAdd', { count: plan.toAdd.length })}
                </p>
                <p className="text-muted-foreground">{classSummary(plan.toAdd)}</p>
              </div>
            ) : (
              <p className="font-medium">{t('children.nothingToAdd')}</p>
            )}

            {plan.alreadyExisting > 0 && (
              <p className="text-muted-foreground">
                {t('children.alreadyExisting', { count: plan.alreadyExisting })}
              </p>
            )}
            {plan.duplicatesInFile > 0 && (
              <p className="text-muted-foreground">
                {t('children.duplicatesInFile', { count: plan.duplicatesInFile })}
              </p>
            )}

            {found.problems.length > 0 && (
              <div>
                <p>{t('children.problemRows', { count: found.problems.length })}</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {found.problems.slice(0, PROBLEMS_SHOWN).map(({ row, problem }) => (
                    <li key={row}>
                      {t('children.problemRow', {
                        row,
                        problem: t(`children.problems.${problem}`),
                      })}
                    </li>
                  ))}
                  {found.problems.length > PROBLEMS_SHOWN && (
                    <li>
                      {t('children.moreProblems', {
                        count: found.problems.length - PROBLEMS_SHOWN,
                      })}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </>
        )}

        {saveFailed && <p className="text-destructive">{t('common.saveFailed')}</p>}
      </div>

      <div className="flex flex-wrap items-start gap-2">
        {chooseFile}
        {!plan && <ExampleFileButton variant="ghost" />}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        {plan && plan.toAdd.length > 0 && (
          <Button type="button" disabled={saving} onClick={() => onImport(plan.toAdd)}>
            {t('children.importAction', { count: plan.toAdd.length })}
          </Button>
        )}
      </DialogFooter>
    </div>
  )
}

/** "1A (5), 2B (5)": how many of the new children go into each class. */
function classSummary(children: ChildInput[]): string {
  const counts = new Map<string, number>()
  for (const child of children) {
    counts.set(child.className, (counts.get(child.className) ?? 0) + 1)
  }
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b, 'sv', { numeric: true }))
    .map(([className, count]) => `${className} (${count})`)
    .join(', ')
}
