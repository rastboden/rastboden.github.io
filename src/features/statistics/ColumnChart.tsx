import { useState } from 'react'
import { cn } from '@/lib/utils'
import { niceAxisMax } from './statistics'

export interface Column {
  key: string
  /** Short text under the column, or `null` to leave this column unlabelled. */
  axisLabel: string | null
  /** Full description, e.g. the whole date. Shown in the tooltip. */
  fullLabel: string
  value: number
  /** The value as text, e.g. "3 utlån". Shown in the tooltip. */
  valueText: string
}

/**
 * Columns for one series over time. Each column is a button, so its value can
 * be read by hovering, tapping or tabbing to it; the same values are meant to
 * be offered as a table next to the chart.
 */
export function ColumnChart({ columns }: { columns: Column[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const axisMax = niceAxisMax(Math.max(0, ...columns.map((column) => column.value)))
  const ticks = [axisMax, axisMax / 2, 0]
  const share = (value: number) => `${(value / axisMax) * 100}%`
  /** Horizontal centre of a column, 0–1 across the plot. */
  const centre = (index: number) => (index + 0.5) / columns.length
  const active = activeIndex === null ? undefined : columns[activeIndex]

  return (
    <div className="flex gap-2 pr-3">
      <div aria-hidden className="relative h-40 w-6 shrink-0 text-[0.6875rem] text-muted-foreground tabular-nums">
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute right-0 translate-y-1/2 leading-none"
            style={{ bottom: share(tick) }}
          >
            {tick}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative h-40">
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className="absolute inset-x-0 border-t border-border"
              style={{ bottom: share(tick) }}
            />
          ))}

          <div className="absolute inset-0 flex">
            {columns.map((column, index) => (
              <button
                key={column.key}
                type="button"
                aria-label={`${column.fullLabel}: ${column.valueText}`}
                className="group flex h-full min-w-0 flex-1 items-end justify-center outline-none"
                onPointerEnter={() => setActiveIndex(index)}
                onPointerLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
              >
                {/* At most 24px wide, with a 2px gap to the neighbours when columns are tight. */}
                <span
                  className={cn(
                    'block w-[min(1.5rem,100%-2px)] rounded-t-[4px] bg-chart-1 group-focus-visible:ring-2 group-focus-visible:ring-ring',
                    activeIndex === index && 'brightness-125',
                  )}
                  style={{
                    height: column.value === 0 ? 0 : `max(2px, ${share(column.value)})`,
                  }}
                />
              </button>
            ))}
          </div>

          {active && activeIndex !== null && (
            <div
              aria-hidden
              className="pointer-events-none absolute z-10 mb-1.5 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background shadow"
              style={{
                left: `${centre(activeIndex) * 100}%`,
                bottom: share(active.value),
                // Slides the anchor from the tooltip's left edge to its right edge
                // across the plot, so the tooltip never sticks out of the chart.
                transform: `translateX(-${centre(activeIndex) * 100}%)`,
              }}
            >
              <span className="block font-semibold">{active.valueText}</span>
              <span className="block opacity-80">{active.fullLabel}</span>
            </div>
          )}
        </div>

        <div aria-hidden className="relative mt-1.5 h-4 text-[0.6875rem] text-muted-foreground">
          {columns.map(
            (column, index) =>
              column.axisLabel !== null && (
                <span
                  key={column.key}
                  className="absolute -translate-x-1/2 leading-none whitespace-nowrap"
                  style={{ left: `${centre(index) * 100}%` }}
                >
                  {column.axisLabel}
                </span>
              ),
          )}
        </div>
      </div>
    </div>
  )
}
