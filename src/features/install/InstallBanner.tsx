import { Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { InstallAction } from './InstallAction'
import { useInstallState } from './installStore'

const DISMISSED_KEY = 'installBannerDismissed'

// Storage can be unavailable (e.g. private browsing); the banner then simply
// comes back on the next visit.
function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function rememberDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // See wasDismissed.
  }
}

/**
 * Invites someone who opened the page in a browser to install it as an app.
 * Hidden once installed or dismissed; the same offer stays under Settings.
 */
export function InstallBanner() {
  const { t } = useTranslation()
  const state = useInstallState()
  const [dismissed, setDismissed] = useState(wasDismissed)
  // Settings has its own install section; showing the banner above it would say everything twice.
  const onSettings = useLocation().pathname === '/settings'

  if (dismissed || onSettings || (state !== 'promptable' && state !== 'ios')) {
    return null
  }

  return (
    <aside
      aria-label={t('install.title')}
      className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3"
    >
      <div className="flex items-start gap-3">
        <Smartphone aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t('install.title')}</p>
          <p className="text-sm text-muted-foreground">{t('install.bannerText')}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          size="lg"
          variant="ghost"
          onClick={() => {
            rememberDismissed()
            setDismissed(true)
          }}
        >
          {t('install.notNow')}
        </Button>
        <InstallAction state={state} />
      </div>
    </aside>
  )
}
