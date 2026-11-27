import type { ChildInput } from '@/db/children'
import { columnKeys, parseClassList, type ColumnKey, type ParsedClassList } from './classList'

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Made-up children for the example file. No real person is meant. */
const exampleChildren: ChildInput[] = [
  { firstName: 'Alva', lastName: 'Andersson', className: '1A' },
  { firstName: 'Elias', lastName: 'Berg', className: '1A' },
  { firstName: 'Maja', lastName: 'Carlsson', className: '1A' },
  { firstName: 'Noah', lastName: 'Dahl', className: '1A' },
  { firstName: 'Saga', lastName: 'Ek', className: '1A' },
  { firstName: 'Hugo', lastName: 'Forsberg', className: '2B' },
  { firstName: 'Wilma', lastName: 'Gustafsson', className: '2B' },
  { firstName: 'Liam', lastName: 'Holm', className: '2B' },
  { firstName: 'Ella', lastName: 'Isaksson', className: '2B' },
  { firstName: 'Oscar', lastName: 'Jonsson', className: '2B' },
]

// The Excel libraries are only loaded when a file is actually read or made,
// so they do not slow down the start of the app.

/** Reads the first sheet of an .xlsx file as a class list. Throws if it is not an .xlsx file. */
export async function readClassListFile(file: Blob): Promise<ParsedClassList> {
  const { readSheet } = await import('read-excel-file/universal')
  return parseClassList(await readSheet(file))
}

/**
 * Makes the example file: the header row in the given language and a few
 * made-up children. It doubles as a template and as test data for the import.
 */
export async function buildExampleFile(
  headers: Record<ColumnKey, string>,
  fileName: string,
): Promise<File> {
  const { default: writeExcelFile } = await import('write-excel-file/universal')
  const headerRow = columnKeys.map((key) => ({ value: headers[key], fontWeight: 'bold' as const }))
  const childRows = exampleChildren.map((child) => columnKeys.map((key) => ({ value: child[key] })))

  const blob = await writeExcelFile([headerRow, ...childRows], {
    columns: columnKeys.map(() => ({ width: 18 })),
    stickyRowsCount: 1,
  }).toBlob()
  return new File([blob], fileName, { type: XLSX_TYPE })
}
