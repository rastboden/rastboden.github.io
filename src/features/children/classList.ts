import type { ChildInput } from '@/db/children'
import type { Child } from '@/db/schema'
import { childFormSchema } from './childForm'

/**
 * The class list file format: one sheet, a header row, one child per row.
 * Columns are found by their header, so their order does not matter and
 * extra columns are ignored. Headers are accepted in Swedish and English,
 * whatever language the app is showing.
 */
export const columnKeys = ['firstName', 'lastName', 'className'] as const
export type ColumnKey = (typeof columnKeys)[number]

const columns: Record<ColumnKey, { required: boolean; headers: string[] }> = {
  firstName: { required: true, headers: ['Förnamn', 'First name'] },
  lastName: { required: false, headers: ['Efternamn', 'Last name'] },
  className: { required: true, headers: ['Klass', 'Class'] },
}

export type RowProblem = 'missingFirstName' | 'missingClassName' | 'tooLong'

export type ParsedClassList =
  | {
      kind: 'ok'
      children: ChildInput[]
      /** Rows that were left out, with their row number as Excel shows it. */
      problems: { row: number; problem: RowProblem }[]
    }
  | { kind: 'missingColumns'; missing: ColumnKey[] }
  | { kind: 'empty' }

/** Headers are compared without regard to case or spaces: "First Name" is "firstname". */
function normaliseHeader(value: unknown): string {
  return cellText(value).toLocaleLowerCase('sv').replaceAll(/\s+/g, '')
}

/** A cell as trimmed text. A class entered as the number 3 becomes "3". */
function cellText(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

function isBlank(row: readonly unknown[]): boolean {
  return row.every((cell) => cellText(cell) === '')
}

/** Turns the rows of a sheet into children to add, plus the rows that could not be used. */
export function parseClassList(rows: readonly (readonly unknown[])[]): ParsedClassList {
  const headerIndex = rows.findIndex((row) => !isBlank(row))
  if (headerIndex === -1) {
    return { kind: 'empty' }
  }

  const headerRow = rows[headerIndex].map(normaliseHeader)
  const columnIndex = (key: ColumnKey) =>
    headerRow.findIndex((header) =>
      columns[key].headers.some((accepted) => normaliseHeader(accepted) === header),
    )
  const indexes = {
    firstName: columnIndex('firstName'),
    lastName: columnIndex('lastName'),
    className: columnIndex('className'),
  }

  const missing = columnKeys.filter((key) => columns[key].required && indexes[key] === -1)
  if (missing.length > 0) {
    return { kind: 'missingColumns', missing }
  }

  const children: ChildInput[] = []
  const problems: { row: number; problem: RowProblem }[] = []

  rows.forEach((row, index) => {
    if (index <= headerIndex || isBlank(row)) {
      return
    }
    const candidate = {
      firstName: cellText(row[indexes.firstName]),
      // A missing last-name column simply leaves every last name empty.
      lastName: indexes.lastName === -1 ? '' : cellText(row[indexes.lastName]),
      className: cellText(row[indexes.className]),
    }
    // The same rules as the add-child dialog, so both ways in agree on what is valid.
    const result = childFormSchema.safeParse(candidate)
    if (result.success) {
      children.push(result.data)
      return
    }
    const problem: RowProblem =
      candidate.firstName === ''
        ? 'missingFirstName'
        : candidate.className === ''
          ? 'missingClassName'
          : 'tooLong'
    problems.push({ row: index + 1, problem })
  })

  if (children.length === 0 && problems.length === 0) {
    return { kind: 'empty' }
  }
  return { kind: 'ok', children, problems }
}

function identity(child: ChildInput): string {
  return [child.firstName, child.lastName, child.className]
    .map((part) => part.toLocaleLowerCase('sv'))
    .join('\u0000')
}

export interface ImportPlan {
  toAdd: ChildInput[]
  /** Children in the file that are already in the app (same name and class). */
  alreadyExisting: number
  /** Extra copies of a child that is in the file more than once. */
  duplicatesInFile: number
}

/** Decides which of the children in a file are new, so importing a list twice adds nothing. */
export function planImport(children: ChildInput[], existing: Child[]): ImportPlan {
  const known = new Set(existing.map(identity))
  const seen = new Set<string>()
  const plan: ImportPlan = { toAdd: [], alreadyExisting: 0, duplicatesInFile: 0 }

  for (const child of children) {
    const key = identity(child)
    if (known.has(key)) {
      plan.alreadyExisting += 1
    } else if (seen.has(key)) {
      plan.duplicatesInFile += 1
    } else {
      seen.add(key)
      plan.toAdd.push(child)
    }
  }
  return plan
}
