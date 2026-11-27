import { Archive } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'

interface FormFooterProps {
  onCancel: () => void
  isSubmitting: boolean
  /** Shows an Archive button when given. Leave out when adding something new. */
  archive?: {
    /** Explains what archiving means, shown before the user confirms. */
    hint: string
    onConfirm: () => void
  }
}

/**
 * Cancel and Save for an add/edit dialog, plus Archive when editing.
 * Archiving cannot be undone from the app, so it takes a second, explicit tap.
 */
export function FormFooter({ onCancel, isSubmitting, archive }: FormFooterProps) {
  const { t } = useTranslation()
  const [confirmingArchive, setConfirmingArchive] = useState(false)

  if (archive && confirmingArchive) {
    return (
      <div className="grid gap-3">
        <p className="text-sm">{archive.hint}</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setConfirmingArchive(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="destructive" onClick={archive.onConfirm}>
            <Archive aria-hidden />
            {t('common.archiveConfirm')}
          </Button>
        </DialogFooter>
      </div>
    )
  }

  return (
    <DialogFooter>
      {archive && (
        <Button
          type="button"
          variant="destructive"
          className="sm:mr-auto"
          disabled={isSubmitting}
          onClick={() => setConfirmingArchive(true)}
        >
          <Archive aria-hidden />
          {t('common.archive')}
        </Button>
      )}
      <Button type="button" variant="outline" onClick={onCancel}>
        {t('common.cancel')}
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {t('common.save')}
      </Button>
    </DialogFooter>
  )
}
