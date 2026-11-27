import { Download } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { saveFile } from '@/lib/saveFile'
import { buildExampleFile } from './classListFile'

/**
 * Makes and hands over the example class list. The headers follow the app's
 * language; the import reads both languages, so either file works anywhere.
 */
export function ExampleFileButton({ variant = 'outline' }: { variant?: 'outline' | 'ghost' }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function onClick() {
    setBusy(true)
    setFailed(false)
    try {
      const file = await buildExampleFile(
        {
          firstName: t('children.firstName'),
          lastName: t('children.lastName'),
          className: t('children.className'),
        },
        t('children.exampleFileName'),
      )
      await saveFile(file)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid justify-items-start gap-2">
      <Button type="button" size="lg" variant={variant} disabled={busy} onClick={onClick}>
        <Download aria-hidden />
        {t('children.exampleFile')}
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {t('children.exampleFailed')}
        </p>
      )}
    </div>
  )
}
