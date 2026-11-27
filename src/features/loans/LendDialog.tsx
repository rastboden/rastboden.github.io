import { useLiveQuery } from 'dexie-react-hooks'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Picker } from '@/components/Picker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { childName, listChildren } from '@/db/children'
import { lendToy, listAvailableToys, ToyAlreadyLentError } from '@/db/loans'
import type { Child, Toy } from '@/db/schema'
import { StoredToyImage } from '@/features/toys/ToyImage'
import { formatDuration } from '@/lib/formatDuration'
import { minutesToMilliseconds } from '@/lib/time'

const NOTE_MAX = 200

/** Loan times to choose from, in minutes. `null` means the loan has no time limit. */
const DURATION_CHOICES: (number | null)[] = [null, 15, 30, 60]

export function LendDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t('common.close')}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{t('loans.lend')}</DialogTitle>
          <DialogDescription className="sr-only">{t('loans.lend')}</DialogDescription>
        </DialogHeader>
        {/* The content only exists while the dialog is open, so the form starts fresh each time. */}
        <LendForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function LendForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const formId = useId()
  const toys = useLiveQuery(listAvailableToys)
  const children = useLiveQuery(listChildren)

  const [toy, setToy] = useState<Toy>()
  const [child, setChild] = useState<Child>()
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<'alreadyLent' | 'save' | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!toy || !child) {
      return
    }
    setSaving(true)
    try {
      const now = Date.now()
      await lendToy(
        {
          toyId: toy.id,
          childId: child.id,
          dueAt: durationMinutes === null ? null : now + minutesToMilliseconds(durationMinutes),
          note: note.trim(),
        },
        now,
      )
      onDone()
    } catch (error) {
      setProblem(error instanceof ToyAlreadyLentError ? 'alreadyLent' : 'save')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <Picker
        label={t('loans.toy')}
        items={toys}
        selected={toy}
        onSelect={setToy}
        getKey={(item) => item.id}
        getLabel={(item) => item.name}
        getDetail={(item) => item.category}
        renderLeading={(item) => <StoredToyImage toyId={item.id} className="size-9" />}
        emptyText={t('loans.noToysAvailable')}
        error={submitted && !toy ? t('loans.toyRequired') : undefined}
      />

      <Picker
        label={t('loans.child')}
        items={children}
        selected={child}
        onSelect={setChild}
        getKey={(item) => item.id}
        getLabel={childName}
        getDetail={(item) => item.className}
        emptyText={t('loans.noChildren')}
        error={submitted && !child ? t('loans.childRequired') : undefined}
      />

      <div role="group" aria-labelledby={`${formId}-duration`} className="grid gap-2">
        <span id={`${formId}-duration`} className="text-sm font-medium">
          {t('loans.duration')}
        </span>
        <div className="grid grid-cols-4 gap-2">
          {DURATION_CHOICES.map((minutes) => {
            const selected = durationMinutes === minutes
            return (
              <Button
                key={minutes ?? 'none'}
                type="button"
                size="lg"
                variant={selected ? 'default' : 'outline'}
                aria-pressed={selected}
                onClick={() => setDurationMinutes(minutes)}
              >
                {minutes === null
                  ? t('loans.noDueTime')
                  : formatDuration(minutesToMilliseconds(minutes), t)}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-note`}>{t('loans.note')}</Label>
        <Input
          id={`${formId}-note`}
          maxLength={NOTE_MAX}
          autoComplete="off"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem === 'alreadyLent' ? t('loans.alreadyLent') : t('common.saveFailed')}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={saving}>
          {t('loans.lend')}
        </Button>
      </DialogFooter>
    </form>
  )
}
