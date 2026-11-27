import { Check, Download, Share, SquarePlus } from 'lucide-react'
import { useState } from 'react'
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
import { promptInstall, type InstallState } from './installStore'

/**
 * The button that installs the app. Where the browser can do it, the button
 * opens the browser's own dialog. On iPhone and iPad it opens step-by-step
 * instructions, because only the user can add an app there.
 * Renders nothing in the other states.
 */
export function InstallAction({ state }: { state: InstallState }) {
  const { t } = useTranslation()
  const [helpOpen, setHelpOpen] = useState(false)

  if (state === 'promptable') {
    return (
      <Button size="lg" onClick={() => void promptInstall()}>
        <Download aria-hidden />
        {t('install.install')}
      </Button>
    )
  }

  if (state !== 'ios') {
    return null
  }

  return (
    <>
      <Button size="lg" onClick={() => setHelpOpen(true)}>
        {t('install.showHow')}
      </Button>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent closeLabel={t('common.close')}>
          <DialogHeader>
            <DialogTitle>{t('install.iosTitle')}</DialogTitle>
            <DialogDescription>{t('install.iosNote')}</DialogDescription>
          </DialogHeader>
          <ol className="grid gap-3">
            <li className="flex items-center gap-3">
              <Share aria-hidden className="size-5 shrink-0 text-primary" />
              <span>{t('install.iosStep1')}</span>
            </li>
            <li className="flex items-center gap-3">
              <SquarePlus aria-hidden className="size-5 shrink-0 text-primary" />
              <span>{t('install.iosStep2')}</span>
            </li>
            <li className="flex items-center gap-3">
              <Check aria-hidden className="size-5 shrink-0 text-primary" />
              <span>{t('install.iosStep3')}</span>
            </li>
          </ol>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHelpOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
