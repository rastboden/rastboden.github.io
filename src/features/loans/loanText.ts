import { dateLocale } from '@/lib/dateLocale'

/**
 * Lines of a loan as one sentence part in the given language, e.g.
 * "3 Hopprep och 1 Fotboll".
 */
export function describeLines(
  lines: { name: string; quantity: number }[],
  language: string | undefined,
): string {
  const parts = lines.map((line) => `${line.quantity} ${line.name}`)
  return new Intl.ListFormat(dateLocale(language), { style: 'long', type: 'conjunction' }).format(
    parts,
  )
}
