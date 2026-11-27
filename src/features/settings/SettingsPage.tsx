import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { languages } from '@/i18n'

export function SettingsPage() {
  const { t, i18n } = useTranslation()

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
    </>
  )
}
