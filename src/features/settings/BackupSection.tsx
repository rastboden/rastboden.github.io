import { Download, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  backupFileName,
  BackupReadError,
  createBackup,
  parseBackup,
  restoreBackup,
  type Backup,
} from '@/db/backup'
import { BACKUP_REMINDER_DAYS, useBackupStatus } from '@/hooks/useBackupStatus'
import { recordBackup } from '@/lib/lastBackup'
import { requestPersistentStorage, type StorageProtection } from '@/lib/persistentStorage'
import { saveFile } from '@/lib/saveFile'
import { cn } from '@/lib/utils'

/** What the message under the buttons is saying, if anything. */
type Notice =
  | 'saved'
  | 'saveFailed'
  | 'restored'
  | 'restoreFailed'
  | 'notBackup'
  | 'newerVersion'
  | null

const FAILURES: Notice[] = ['saveFailed', 'restoreFailed', 'notBackup', 'newerVersion']

export function BackupSection() {
  const { t, i18n } = useTranslation()
  const { lastBackupAt, isDue } = useBackupStatus()
  const [protection, setProtection] = useState<StorageProtection>('unknown')
  const [notice, setNotice] = useState<Notice>(null)
  const [busy, setBusy] = useState(false)
  /** A backup that has been read from a file and waits for the user to confirm. */
  const [chosen, setChosen] = useState<Backup | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let current = true
    void requestPersistentStorage().then((answer) => {
      if (current) {
        setProtection(answer)
      }
    })
    return () => {
      current = false
    }
  }, [])

  const formatTime = (time: number) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(time)

  async function onSave() {
    setBusy(true)
    setNotice(null)
    try {
      const backup = await createBackup()
      const file = new File([JSON.stringify(backup)], backupFileName(backup.createdAt), {
        type: 'application/json',
      })
      if ((await saveFile(file)) === 'saved') {
        recordBackup(backup.createdAt)
        setNotice('saved')
      }
    } catch {
      setNotice('saveFailed')
    } finally {
      setBusy(false)
    }
  }

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Cleared so that choosing the same file again is noticed.
    event.target.value = ''
    if (!file) {
      return
    }
    setNotice(null)
    try {
      setChosen(parseBackup(await file.text()))
    } catch (error) {
      setNotice(error instanceof BackupReadError ? error.problem : 'notBackup')
    }
  }

  async function onRestore(backup: Backup) {
    setBusy(true)
    try {
      await restoreBackup(backup)
      // The device now holds exactly what the file holds.
      recordBackup(backup.createdAt)
      setNotice('restored')
    } catch {
      setNotice('restoreFailed')
    } finally {
      setBusy(false)
      setChosen(null)
    }
  }

  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-medium">{t('settings.backup.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('settings.backup.intro')}</p>

      <p className={cn('text-sm', isDue && 'font-medium text-destructive')}>
        {lastBackupAt === null
          ? t('settings.backup.never')
          : t('settings.backup.last', { time: formatTime(lastBackupAt) })}
        {isDue && lastBackupAt !== null && (
          <> {t('settings.backup.due', { count: BACKUP_REMINDER_DAYS })}</>
        )}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" disabled={busy} onClick={() => void onSave()}>
          <Download aria-hidden />
          {t('settings.backup.save')}
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <Upload aria-hidden />
          {t('settings.backup.restore')}
        </Button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void onFileChosen(event)}
      />

      {/* Always present so that screen readers announce the message when it appears. */}
      <p
        role="status"
        className={cn('text-sm', FAILURES.includes(notice) && 'text-destructive', !notice && 'hidden')}
      >
        {notice && t(`settings.backup.notice.${notice}`)}
      </p>

      <p className="text-sm text-muted-foreground">{t('settings.backup.fileHint')}</p>
      {protection !== 'unknown' && (
        <p className="text-sm text-muted-foreground">{t(`settings.backup.storage.${protection}`)}</p>
      )}

      <Dialog open={chosen !== null} onOpenChange={(open) => !open && setChosen(null)}>
        <DialogContent closeLabel={t('common.close')}>
          <DialogHeader>
            <DialogTitle>{t('settings.backup.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {chosen &&
                t('settings.backup.confirmContents', {
                  time: formatTime(chosen.createdAt),
                  toys: chosen.toys.length,
                  children: chosen.children.length,
                  loans: chosen.loans.length,
                })}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium">{t('settings.backup.confirmWarning')}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setChosen(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => chosen && void onRestore(chosen)}
            >
              {t('settings.backup.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
