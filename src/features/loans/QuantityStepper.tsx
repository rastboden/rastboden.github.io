import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A count with a minus and a plus button, sized for small fingers. The buttons
 * stop at `min` and `max` instead of going past them.
 */
export function QuantityStepper({
  value,
  min = 0,
  max,
  onChange,
  fewerLabel,
  moreLabel,
  className,
}: {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  /** Screen-reader text for the minus button, e.g. "One fewer Hopprep". */
  fewerLabel: string
  /** Screen-reader text for the plus button, e.g. "One more Hopprep". */
  moreLabel: string
  className?: string
}) {
  const button =
    'flex size-12 shrink-0 items-center justify-center rounded-xl text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:text-muted-foreground/50'

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <button
        type="button"
        aria-label={fewerLabel}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={button}
      >
        <Minus aria-hidden className="size-6" strokeWidth={2.5} />
      </button>
      <span aria-live="polite" className="min-w-6 text-center text-xl font-bold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label={moreLabel}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={button}
      >
        <Plus aria-hidden className="size-6" strokeWidth={2.5} />
      </button>
    </div>
  )
}
