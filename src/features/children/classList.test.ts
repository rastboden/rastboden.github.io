import { describe, expect, it } from 'vitest'
import type { Child } from '@/db/schema'
import { en } from '@/i18n/locales/en'
import { sv } from '@/i18n/locales/sv'
import { parseClassList, planImport } from './classList'
import { buildExampleFile, readClassListFile } from './classListFile'

const child = (firstName: string, lastName: string, className: string) => ({
  firstName,
  lastName,
  className,
})

describe('parseClassList', () => {
  it('reads one child per row under Swedish headers', () => {
    const parsed = parseClassList([
      ['Förnamn', 'Efternamn', 'Klass'],
      ['Alva', 'Andersson', '1A'],
      ['Elias', 'Berg', '2B'],
    ])

    expect(parsed).toEqual({
      kind: 'ok',
      children: [child('Alva', 'Andersson', '1A'), child('Elias', 'Berg', '2B')],
      problems: [],
    })
  })

  it('finds columns by header whatever their order, case, language or neighbours', () => {
    const parsed = parseClassList([
      ['Notes', 'CLASS', ' first NAME ', 'Last name'],
      ['likes football', '1A', 'Alva', 'Andersson'],
    ])

    expect(parsed).toMatchObject({ kind: 'ok', children: [child('Alva', 'Andersson', '1A')] })
  })

  it('accepts a file without a last-name column', () => {
    const parsed = parseClassList([
      ['Förnamn', 'Klass'],
      ['Alva', '1A'],
    ])

    expect(parsed).toMatchObject({ kind: 'ok', children: [child('Alva', '', '1A')] })
  })

  it('turns a class typed as a number into text, and trims spaces', () => {
    const parsed = parseClassList([
      ['Förnamn', 'Efternamn', 'Klass'],
      ['  Alva ', null, 3],
    ])

    expect(parsed).toMatchObject({ kind: 'ok', children: [child('Alva', '', '3')] })
  })

  it('skips blank rows and tolerates blank rows above the headers', () => {
    const parsed = parseClassList([
      [null, null, null],
      ['Förnamn', 'Efternamn', 'Klass'],
      ['Alva', 'Andersson', '1A'],
      ['', ' ', null],
      ['Elias', 'Berg', '1A'],
    ])

    expect(parsed).toMatchObject({ kind: 'ok', problems: [] })
    expect(parsed.kind === 'ok' && parsed.children).toHaveLength(2)
  })

  it('leaves out rows it cannot use and says which Excel row and why', () => {
    const parsed = parseClassList([
      ['Förnamn', 'Efternamn', 'Klass'],
      ['', 'Andersson', '1A'],
      ['Elias', 'Berg', ''],
      ['Maja', 'Carlsson', '1A'],
      ['N'.repeat(200), 'Dahl', '1A'],
    ])

    expect(parsed).toEqual({
      kind: 'ok',
      children: [child('Maja', 'Carlsson', '1A')],
      problems: [
        { row: 2, problem: 'missingFirstName' },
        { row: 3, problem: 'missingClassName' },
        { row: 5, problem: 'tooLong' },
      ],
    })
  })

  it('names the required columns that are missing', () => {
    expect(parseClassList([['Namn', 'Efternamn'], ['Alva', 'Andersson']])).toEqual({
      kind: 'missingColumns',
      missing: ['firstName', 'className'],
    })
  })

  it('reports a sheet with no children as empty', () => {
    expect(parseClassList([])).toEqual({ kind: 'empty' })
    expect(parseClassList([['Förnamn', 'Efternamn', 'Klass']])).toEqual({ kind: 'empty' })
  })
})

describe('planImport', () => {
  const existing = (firstName: string, lastName: string, className: string): Child => ({
    id: `${firstName}-${lastName}`,
    firstName,
    lastName,
    className,
    createdAt: 0,
    archivedAt: null,
  })

  it('adds only children who are not already there, ignoring case', () => {
    const plan = planImport(
      [child('Alva', 'Andersson', '1A'), child('Elias', 'Berg', '1A')],
      [existing('alva', 'ANDERSSON', '1a')],
    )

    expect(plan).toEqual({
      toAdd: [child('Elias', 'Berg', '1A')],
      alreadyExisting: 1,
      duplicatesInFile: 0,
    })
  })

  it('adds a child once when the file lists them twice', () => {
    const plan = planImport([child('Alva', 'Andersson', '1A'), child('Alva', 'Andersson', '1A')], [])

    expect(plan).toMatchObject({ toAdd: [child('Alva', 'Andersson', '1A')], duplicatesInFile: 1 })
  })

  it('treats the same name in another class as a different child', () => {
    const plan = planImport([child('Alva', 'Andersson', '2B')], [existing('Alva', 'Andersson', '1A')])

    expect(plan.toAdd).toHaveLength(1)
  })
})

describe('the example file', () => {
  // Guards the promise that the file offered in Settings can always be imported,
  // in both languages, with the real Excel reader and writer.
  it.each([
    ['Swedish', sv.children],
    ['English', en.children],
  ])('made with %s headers reads back as ten valid children', async (_language, labels) => {
    const file = await buildExampleFile(
      { firstName: labels.firstName, lastName: labels.lastName, className: labels.className },
      'example.xlsx',
    )

    const parsed = await readClassListFile(file)

    expect(parsed).toMatchObject({ kind: 'ok', problems: [] })
    expect(parsed.kind === 'ok' && parsed.children).toHaveLength(10)
    expect(parsed.kind === 'ok' && parsed.children[0]).toEqual(child('Alva', 'Andersson', '1A'))
  })

  it('is refused when the file is not an Excel file', async () => {
    await expect(readClassListFile(new Blob(['not a spreadsheet']))).rejects.toThrow()
  })
})
