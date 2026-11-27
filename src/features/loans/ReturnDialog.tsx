import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { focusDialogNotField } from '@/components/dialogFocus'
import { useOpeningKey } from '@/components/useOpeningKey'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { childName } from '@/db/children'
import { totalQuantity, type LoanDetails, type LoanLine } from '@/db/loans'
import { StoredToyImage } from '@/features/toys/ToyImage'
import { QuantityStepper } from './QuantityStepper'
import { ToyQuantity } from './ToyQuantity'

/**
 * For the unusual case that only some of a loan comes back: choose how many
 * of each toy. Returning everything is one tap on the loan itself.
 */
export function ReturnDialog({
  open,
  onOpenChange,
  details,
  onReturn,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The loan to return from. Kept while the dialog closes, so it does not empty mid-animation. */
  details: LoanDetails | undefined
  onReturn: (lines: LoanLine[]) => void
}) {
  const { t } = useTranslation()
  const openingKey = useOpeningKey(open)
  const child = details?.child

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t('common.close')}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onOpenAutoFocus={focusDialogNotField}
      >
        <DialogHeader>
          <DialogTitle>{t('loans.returnSomeTitle')}</DialogTitle>
          <DialogDescription>
            {child ? `${childName(child)} · ${child.className}` : t('loans.unknownChild')}
          </DialogDescription>
        </DialogHeader>
        {details && (
          <ReturnForm
            key={openingKey}
            details={details}
            onCancel={() => onOpenChange(false)}
            onReturn={onReturn}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ReturnForm({
  details,
  onCancel,
  onReturn,
}: {
  details: LoanDetails
  onCancel: () => void
  onReturn: (lines: LoanLine[]) => void
}) {
  const { t } = useTranslation()
  /** How many of each toy come back, by toy id. Starts at none. */
  const [quantities, setQuantities] = useState<ReadonlyMap<string, number>>(new Map())

  const lines = details.outstanding.flatMap(({ toyId }) => {
    const quantity = quantities.get(toyId) ?? 0
    return quantity > 0 ? [{ toyId, quantity }] : []
  })
  const count = totalQuantity(lines)

  return (
    <>
      <ul className="grid gap-2">
        {details.outstanding.map((line) => {
          const name = line.toy?.name ?? t('loans.unknownToy')
          return (
            <li key={line.toyId} className="flex items-center gap-3">
              <StoredToyImage toyId={line.toyId} className="size-12" />
              <span className="min-w-0 flex-1 truncate text-base">
                <ToyQuantity toy={line.toy} quantity={line.quantity} />
              </span>
              <QuantityStepper
                value={quantities.get(line.toyId) ?? 0}
                max={line.quantity}
                onChange={(value) => setQuantities(new Map(quantities).set(line.toyId, value))}
                fewerLabel={t('loans.oneFewer', { toy: name })}
                moreLabel={t('loans.oneMore', { toy: name })}
                className="shrink-0 gap-1 rounded-xl bg-muted"
              />
            </li>
          )
        })}
      </ul>

      <DialogFooter>
        <Button type="button" size="lg" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="button" size="lg" disabled={count === 0} onClick={() => onReturn(lines)}>
          {count > 0 ? t('loans.returnCount', { count }) : t('loans.return')}
        </Button>
      </DialogFooter>
    </>
  )
}
