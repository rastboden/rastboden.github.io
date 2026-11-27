import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { focusDialogNotField } from '@/components/dialogFocus'
import { useOpeningKey } from '@/components/useOpeningKey'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { childName, listChildren } from '@/db/children'
import { lendToys, totalQuantity } from '@/db/loans'
import type { Child, Toy } from '@/db/schema'
import { listToys } from '@/db/toys'
import { StoredToyImage } from '@/features/toys/ToyImage'
import { cn } from '@/lib/utils'
import { describeLines } from './loanText'
import { QuantityStepper } from './QuantityStepper'

/**
 * The dialog asks one thing at a time, so that a child helping out in the shed
 * can use it: which class, which child, and then what they borrow.
 */
const STEPS = ['class', 'child', 'toys'] as const
type Step = (typeof STEPS)[number]

/** The most of one toy that fits on a loan. Far more than anyone carries, but it keeps the number to two digits. */
const MAX_QUANTITY = 99

/** A large thing to tap: a class, a child or a toy. */
const TILE =
  'rounded-2xl border-2 border-border bg-background outline-none hover:bg-muted focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted'

const ICON_BUTTON =
  'flex size-12 items-center justify-center rounded-xl outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50'

export function LendDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const openingKey = useOpeningKey(open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[calc(100dvh-2rem)] max-h-[46rem] flex-col gap-0 overflow-hidden p-0 text-base sm:max-w-md"
        onOpenAutoFocus={focusDialogNotField}
      >
        {/* A new key for every opening, so the dialog always starts from the first step. */}
        <LendFlow key={openingKey} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function LendFlow({ onDone }: { onDone: () => void }) {
  const { t, i18n } = useTranslation()
  const toys = useLiveQuery(listToys)
  const children = useLiveQuery(listChildren)

  const [step, setStep] = useState<Step>('class')
  const [className, setClassName] = useState<string>()
  const [child, setChild] = useState<Child>()
  /** How many of each toy, by toy id. A toy that is not chosen is not in the map. */
  const [quantities, setQuantities] = useState<ReadonlyMap<string, number>>(new Map())
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  // Each step replaces what is on screen, so keyboard and screen-reader users
  // are taken to the new heading. Not on the first step: the dialog handles its own opening.
  const titleRef = useRef<HTMLHeadingElement>(null)
  const focusedStep = useRef(step)
  useEffect(() => {
    if (focusedStep.current !== step) {
      focusedStep.current = step
      titleRef.current?.focus()
    }
  }, [step])

  const lines = (toys ?? []).flatMap((toy) => {
    const quantity = quantities.get(toy.id) ?? 0
    return quantity > 0 ? [{ toyId: toy.id, name: toy.name, quantity }] : []
  })
  const count = totalQuantity(lines)

  function setQuantity(toyId: string, quantity: number) {
    const next = new Map(quantities)
    if (quantity > 0) {
      next.set(toyId, Math.min(quantity, MAX_QUANTITY))
    } else {
      next.delete(toyId)
    }
    setQuantities(next)
  }

  function chooseChild(chosen: Child) {
    setChild(chosen)
    // Also set when the child was found by name, so that going back shows their class.
    setClassName(chosen.className)
    setStep('toys')
  }

  async function onLend() {
    if (!child || count === 0) {
      return
    }
    setSaving(true)
    try {
      await lendToys({ childId: child.id, lines })
      onDone()
    } catch {
      setSaveFailed(true)
      setSaving(false)
    }
  }

  const stepIndex = STEPS.indexOf(step)
  const title = {
    class: t('loans.whichClass'),
    child: t('loans.whoBorrows'),
    toys: t('loans.whatBorrows', { name: child?.firstName }),
  }[step]

  return (
    <>
      <div className="flex items-center justify-between px-2 pt-2">
        {step === 'class' ? (
          <span className="size-12" />
        ) : (
          <button
            type="button"
            aria-label={t('common.back')}
            onClick={() => setStep(STEPS[stepIndex - 1])}
            className={ICON_BUTTON}
          >
            <ChevronLeft aria-hidden className="size-6" />
          </button>
        )}
        <div aria-hidden className="flex gap-1.5">
          {STEPS.map((name, index) => (
            <span
              key={name}
              className={cn('h-1.5 w-10 rounded-full', index <= stepIndex ? 'bg-primary' : 'bg-border')}
            />
          ))}
        </div>
        <DialogClose asChild>
          <button type="button" aria-label={t('common.close')} className={ICON_BUTTON}>
            <X aria-hidden className="size-6" />
          </button>
        </DialogClose>
      </div>

      <div className="flex items-end justify-between gap-3 px-5 pt-3">
        <DialogHeader className="min-w-0 gap-1">
          <DialogDescription className="truncate font-medium">
            {step === 'toys' && child
              ? `${childName(child)} · ${child.className}`
              : t('loans.step', { step: stepIndex + 1, total: STEPS.length })}
            {step === 'child' && ` · ${t('children.className')} ${className}`}
          </DialogDescription>
          <DialogTitle
            ref={titleRef}
            tabIndex={-1}
            className="text-[1.75rem] leading-tight font-bold tracking-tight outline-none"
          >
            {title}
          </DialogTitle>
        </DialogHeader>
        {step === 'child' && (
          <button
            type="button"
            onClick={() => setStep('class')}
            className="h-11 shrink-0 rounded-full bg-primary/10 px-4 font-semibold text-primary outline-none hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t('loans.changeClass')}
          </button>
        )}
      </div>

      {/* Keyed by step so that each step starts scrolled to the top. */}
      <div key={step} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {step === 'class' && children && (
          <ClassStep
            allChildren={children}
            onChooseClass={(name) => {
              setClassName(name)
              setStep('child')
            }}
            onChooseChild={chooseChild}
          />
        )}
        {step === 'child' && children && (
          <ChildStep
            classmates={children.filter((candidate) => candidate.className === className)}
            onChoose={chooseChild}
          />
        )}
        {step === 'toys' && toys && (
          <ToyStep toys={toys} quantities={quantities} onChange={setQuantity} />
        )}
      </div>

      {step === 'toys' && (
        <div className="grid gap-2.5 border-t px-5 pt-3 pb-5">
          {saveFailed && (
            <p role="alert" className="text-center text-sm text-destructive">
              {t('common.saveFailed')}
            </p>
          )}
          <p className="line-clamp-2 text-center font-medium text-muted-foreground">
            {count > 0 ? describeLines(lines, i18n.resolvedLanguage) : t('loans.chooseToys')}
          </p>
          <Button
            type="button"
            className="h-14 rounded-2xl text-lg font-semibold"
            disabled={count === 0 || saving}
            onClick={onLend}
          >
            {count > 0 ? t('loans.lendCount', { count }) : t('loans.lend')}
          </Button>
        </div>
      )}
    </>
  )
}

/** Step 1: a tile per class, or a child found directly by typing part of their name. */
function ClassStep({
  allChildren,
  onChooseClass,
  onChooseChild,
}: {
  allChildren: Child[]
  onChooseClass: (className: string) => void
  onChooseChild: (child: Child) => void
}) {
  const { t } = useTranslation()
  const searchId = useId()
  const [query, setQuery] = useState('')

  if (allChildren.length === 0) {
    return <p className="text-muted-foreground">{t('loans.noChildren')}</p>
  }

  // The children come sorted by class, so the classes come out in that order too.
  const classNames = [...new Set(allChildren.map((child) => child.className))]
  const needle = query.trim().toLocaleLowerCase('sv')
  const matches = allChildren.filter((child) =>
    childName(child).toLocaleLowerCase('sv').includes(needle),
  )

  return (
    <>
      {/* While searching, the classes give way to the matches, which then sit right under the field. */}
      {!needle && (
        <div className="mb-7 grid grid-cols-3 gap-3">
          {classNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onChooseClass(name)}
              className={cn(TILE, 'h-24 truncate px-2 text-2xl font-bold')}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-2">
        <label htmlFor={searchId} className="font-semibold">
          {t('loans.searchByName')}
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id={searchId}
            type="search"
            autoComplete="off"
            placeholder={t('loans.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-14 w-full rounded-2xl border-2 border-border bg-background pr-4 pl-12 text-lg outline-none placeholder:text-muted-foreground focus-visible:border-primary"
          />
        </div>
      </div>

      {needle && (
        <ul className="mt-3 grid gap-2">
          {matches.map((child) => (
            <li key={child.id}>
              <button
                type="button"
                onClick={() => onChooseChild(child)}
                className={cn(TILE, 'flex min-h-16 w-full items-center gap-3 px-4 text-left')}
              >
                <span className="min-w-0 flex-1 truncate text-lg font-semibold">
                  {childName(child)}
                </span>
                <span className="shrink-0 text-muted-foreground">{child.className}</span>
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="py-2 text-muted-foreground">{t('common.noMatches')}</li>
          )}
        </ul>
      )}
    </>
  )
}

/** Step 2: the children of the chosen class. */
function ChildStep({
  classmates,
  onChoose,
}: {
  classmates: Child[]
  onChoose: (child: Child) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {classmates.map((child) => (
        <button
          key={child.id}
          type="button"
          onClick={() => onChoose(child)}
          className={cn(TILE, 'flex h-20 min-w-0 flex-col justify-center px-4 text-left')}
        >
          <span className="truncate text-xl font-bold">{child.firstName}</span>
          {child.lastName && (
            <span className="truncate text-sm text-muted-foreground">{child.lastName}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/** Step 3: tap a toy to add one of it; the counter on the picture changes how many. */
function ToyStep({
  toys,
  quantities,
  onChange,
}: {
  toys: Toy[]
  quantities: ReadonlyMap<string, number>
  onChange: (toyId: string, quantity: number) => void
}) {
  const { t } = useTranslation()

  if (toys.length === 0) {
    return <p className="text-muted-foreground">{t('loans.noToys')}</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {toys.map((toy) => {
        const quantity = quantities.get(toy.id) ?? 0
        return (
          <div
            key={toy.id}
            className={cn(
              'relative overflow-hidden rounded-2xl border-2 bg-background',
              quantity > 0 ? 'border-primary ring-1 ring-primary' : 'border-border',
            )}
          >
            {/* The whole tile adds one, also when some are chosen already: a second tap means "one more". */}
            <button
              type="button"
              aria-label={quantity > 0 ? t('loans.oneMore', { toy: toy.name }) : undefined}
              disabled={quantity >= MAX_QUANTITY}
              onClick={() => onChange(toy.id, quantity + 1)}
              className="block w-full text-left outline-none hover:bg-muted focus-visible:bg-muted active:bg-muted"
            >
              <StoredToyImage toyId={toy.id} className="aspect-[4/3] w-full rounded-none" />
              <span className="flex h-11 items-center px-3 font-semibold">
                <span className="truncate">{toy.name}</span>
              </span>
            </button>
            {quantity > 0 && (
              <QuantityStepper
                value={quantity}
                max={MAX_QUANTITY}
                onChange={(value) => onChange(toy.id, value)}
                fewerLabel={t('loans.oneFewer', { toy: toy.name })}
                moreLabel={t('loans.oneMore', { toy: toy.name })}
                // Sits on the lower edge of the picture, just above the name. A tap on
                // the number goes through to the tile, so it adds one like the rest of the tile.
                className="pointer-events-none absolute inset-x-2 bottom-13 rounded-xl bg-background shadow-md [&>button]:pointer-events-auto"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
