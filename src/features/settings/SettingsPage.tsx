import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { InstallAction } from '@/features/install/InstallAction'
import { useInstallState } from '@/features/install/installStore'
import { languages } from '@/i18n'
import { BackupSection } from './BackupSection'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const installState = useInstallState()

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <section className="grid gap-2">
        <h2 id="language-heading" className="text-sm font-medium">
          {t('settings.language')}
        </h2>
        <div role="group" aria-labelledby="language-heading" className="grid grid-cols-2 gap-2">
          {languages.map(({ code, label }) => {
            const selected = i18n.resolvedLanguage === code
            return (
              <Button
                key={code}
                size="lg"
                variant={selected ? 'default' : 'outline'}
                aria-pressed={selected}
                lang={code}
                onClick={() => void i18n.changeLanguage(code)}
              >
                {label}
              </Button>
            )
          })}
        </div>
      </section>

      <section className="mt-8 grid justify-items-start gap-2">
        <h2 className="text-sm font-medium">{t('install.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {installState === 'installed'
            ? t('install.installed')
            : installState === 'unavailable'
              ? t('install.unavailable')
              : t('install.bannerText')}
        </p>
        <InstallAction state={installState} />
      </section>

      <div className="mt-8">
        <BackupSection />
      </div>
    </>
  )
}
