import { useTranslation } from 'react-i18next'
import type { Toy } from '@/db/schema'

/** A toy's name, with "3 ×" in front when there is more than one of it. */
export function ToyQuantity({ toy, quantity }: { toy: Toy | undefined; quantity: number }) {
  const { t } = useTranslation()

  return (
    <>
      {quantity > 1 && <span className="font-semibold tabular-nums">{quantity} × </span>}
      {toy?.name ?? t('loans.unknownToy')}
    </>
  )
}
