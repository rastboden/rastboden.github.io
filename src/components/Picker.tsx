import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PickerProps<T> {
  label: string
  /** `undefined` while the items are still loading. */
  items: T[] | undefined
  selected: T | undefined
  onSelect: (item: T | undefined) => void
  getKey: (item: T) => string
  getLabel: (item: T) => string
  /** Second, smaller line, e.g. a class or category. Also searched. */
  getDetail?: (item: T) => string
  renderLeading?: (item: T) => ReactNode
  /** Shown when there is nothing to choose from at all. */
  emptyText: string
  /** Shown when nothing is chosen and the form has been submitted. */
  error?: string
}

/**
 * Choose one item from a searchable list. Once chosen, the list collapses to
 * the chosen item with a button to change it, which keeps the dialog short on a phone.
 */
export function Picker<T>({
  label,
  items,
  selected,
  onSelect,
  getKey,
  getLabel,
  getDetail,
  renderLeading,
  emptyText,
  error,
}: PickerProps<T>) {
  const { t } = useTranslation()
  const id = useId()
  const [query, setQuery] = useState('')

  const row = (item: T) => (
    <>
      {renderLeading?.(item)}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{getLabel(item)}</span>
        {getDetail?.(item) && (
          <span className="block truncate text-sm text-muted-foreground">{getDetail(item)}</span>
        )}
      </span>
    </>
  )

  if (selected) {
    return (
      <div role="group" aria-labelledby={`${id}-label`} className="grid gap-2">
        <span id={`${id}-label`} className="text-sm font-medium">
          {label}
        </span>
        <div className="flex items-center gap-3 rounded-lg border p-2">
          {row(selected)}
          <Button type="button" variant="outline" onClick={() => onSelect(undefined)}>
            {t('common.change')}
          </Button>
        </div>
      </div>
    )
  }

  const needle = query.trim().toLocaleLowerCase('sv')
  const matches = items?.filter((item) =>
    `${getLabel(item)} ${getDetail?.(item) ?? ''}`.toLocaleLowerCase('sv').includes(needle),
  )

  return (
    <div className="grid gap-2">
      <Label htmlFor={`${id}-search`}>{label}</Label>
      {items?.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <>
          <Input
            id={`${id}-search`}
            type="search"
            placeholder={t('common.search')}
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          <ul className="max-h-44 overflow-y-auto rounded-lg border">
            {matches?.map((item) => (
              <li key={getKey(item)} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(item)
                    setQuery('')
                  }}
                  className="flex min-h-11 w-full items-center gap-3 px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
                >
                  {row(item)}
                </button>
              </li>
            ))}
            {matches?.length === 0 && (
              <li className="px-2 py-3 text-sm text-muted-foreground">{t('common.noMatches')}</li>
            )}
          </ul>
        </>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
