import { beforeEach, describe, expect, it } from 'vitest'
import {
  backupFileName,
  BackupReadError,
  createBackup,
  parseBackup,
  restoreBackup,
  type BackupReadProblem,
} from './backup'
import { archiveChild, createChild } from './children'
import { lendToys, returnLoan } from './loans'
import { db } from './schema'
import { archiveToy, createToy } from './toys'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

/** Fills the app with a little of everything and returns what a backup must bring back. */
async function fillApp() {
  const imageBytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255])
  const ball = await createToy(
    { name: 'Boll', note: '' },
    { kind: 'replace', blob: new Blob([imageBytes], { type: 'image/jpeg' }) },
  )
  const doll = await createToy({ name: 'Trasig docka', note: 'Saknar arm' })
  await archiveToy(doll.id)
  const anna = await createChild({ firstName: 'Anna', lastName: 'Ek', className: '2A' })
  const bo = await createChild({ firstName: 'Bo', lastName: '', className: '2A' })
  await archiveChild(bo.id)
  const returned = await lendToys({ childId: bo.id, lines: [{ toyId: ball.id, quantity: 1 }] }, 1000)
  await returnLoan(returned.id, 2000)
  const partlyBack = await lendToys(
    {
      childId: anna.id,
      lines: [
        { toyId: ball.id, quantity: 3 },
        { toyId: doll.id, quantity: 1 },
      ],
    },
    3000,
  )
  await returnLoan(partlyBack.id, 4000, [{ toyId: ball.id, quantity: 2 }])
  return { ball, imageBytes }
}

async function snapshot() {
  return {
    toys: await db.toys.orderBy('id').toArray(),
    children: await db.children.orderBy('id').toArray(),
    loans: await db.loans.orderBy('id').toArray(),
  }
}

function readProblem(text: string): BackupReadProblem | undefined {
  try {
    parseBackup(text)
  } catch (error) {
    if (error instanceof BackupReadError) {
      return error.problem
    }
    throw error
  }
}

describe('backup', () => {
  it('brings everything back on an empty device, through the file text', async () => {
    const { ball, imageBytes } = await fillApp()
    const before = await snapshot()
    const fileText = JSON.stringify(await createBackup())

    await db.delete()
    await db.open()
    await restoreBackup(parseBackup(fileText))

    expect(await snapshot()).toEqual(before)
    const image = await db.toyImages.get(ball.id)
    expect(image?.blob.type).toBe('image/jpeg')
    expect(new Uint8Array(await image!.blob.arrayBuffer())).toEqual(imageBytes)
  })

  it('replaces what is on the device instead of mixing the two', async () => {
    await fillApp()
    const backup = await createBackup()
    const before = await snapshot()
    await createToy({ name: 'Tillagd efteråt', note: '' })
    await createChild({ firstName: 'Ny', lastName: '', className: '3B' })

    await restoreBackup(backup)

    expect(await snapshot()).toEqual(before)
  })

  it('keeps the data on the device when the backup cannot be written', async () => {
    await fillApp()
    const before = await snapshot()
    const broken = await createBackup()
    // The same toy twice cannot be stored, which fails the restore half-way.
    broken.toys.push(broken.toys[0])

    await expect(restoreBackup(broken)).rejects.toThrow()

    expect(await snapshot()).toEqual(before)
    expect(await db.toyImages.count()).toBe(1)
  })

  it('stores images larger than one base64 chunk unchanged', async () => {
    const bytes = new Uint8Array(100_000).map((_, index) => index % 256)
    const toy = await createToy(
      { name: 'Boll', note: '' },
      { kind: 'replace', blob: new Blob([bytes], { type: 'image/jpeg' }) },
    )

    await restoreBackup(parseBackup(JSON.stringify(await createBackup())))

    const image = await db.toyImages.get(toy.id)
    expect(new Uint8Array(await image!.blob.arrayBuffer())).toEqual(bytes)
  })
})

describe('reading a backup file', () => {
  it('turns away files that are not a backup', async () => {
    const backup = await createBackup()

    expect(readProblem('not json')).toBe('notBackup')
    expect(readProblem('{"toys":[]}')).toBe('notBackup')
    expect(readProblem(JSON.stringify({ ...backup, format: 'something-else' }))).toBe('notBackup')
  })

  it('turns away a backup with a table missing or a damaged row', async () => {
    await fillApp()
    const backup = await createBackup()
    const { loans: _loans, ...withoutLoans } = backup
    const damagedToy = { ...backup, toys: [{ ...backup.toys[0], name: 42 }] }
    const damagedImage = { ...backup, toyImages: [{ ...backup.toyImages[0], data: 'not base64!' }] }

    expect(readProblem(JSON.stringify(withoutLoans))).toBe('notBackup')
    expect(readProblem(JSON.stringify(damagedToy))).toBe('notBackup')
    expect(readProblem(JSON.stringify(damagedImage))).toBe('notBackup')
  })

  it('still reads a version 1 backup, leaving out the category toys had then', async () => {
    const { ball } = await fillApp()
    const backup = await createBackup()
    const version1 = {
      ...backup,
      version: 1,
      toys: backup.toys.map((toy) => ({ ...toy, category: 'Ute' })),
    }

    await restoreBackup(parseBackup(JSON.stringify(version1)))

    const restored = await db.toys.get(ball.id)
    expect(restored).toMatchObject({ name: 'Boll' })
    expect(restored).not.toHaveProperty('category')
    expect(await db.toyImages.count()).toBe(1)
  })

  it('still reads a version 2 backup, turning each loan of one toy into a loan with one item', async () => {
    const { ball } = await fillApp()
    const backup = await createBackup()
    // Loans exactly as version 2 wrote them, time limit and note included.
    const version2 = {
      ...backup,
      version: 2,
      loans: [
        {
          id: 'loan-1',
          toyId: ball.id,
          childId: 'child-1',
          lentAt: 1000,
          dueAt: null,
          returnedAt: 2000,
          note: '',
        },
        {
          id: 'loan-2',
          toyId: ball.id,
          childId: 'child-2',
          lentAt: 3000,
          dueAt: 9000,
          returnedAt: null,
          note: 'Rast',
        },
      ],
    }

    await restoreBackup(parseBackup(JSON.stringify(version2)))

    expect(await db.loans.orderBy('id').toArray()).toEqual([
      {
        id: 'loan-1',
        childId: 'child-1',
        lentAt: 1000,
        items: [{ toyId: ball.id, quantity: 1, returnedAt: 2000 }],
      },
      {
        id: 'loan-2',
        childId: 'child-2',
        lentAt: 3000,
        items: [{ toyId: ball.id, quantity: 1, returnedAt: null }],
      },
    ])
  })

  it('turns away a loan with nothing on it, or with part of a toy', async () => {
    await fillApp()
    const backup = await createBackup()
    const [loan] = backup.loans
    const emptyLoan = { ...backup, loans: [{ ...loan, items: [] }] }
    const halfToy = { ...backup, loans: [{ ...loan, items: [{ ...loan.items[0], quantity: 0.5 }] }] }

    expect(readProblem(JSON.stringify(emptyLoan))).toBe('notBackup')
    expect(readProblem(JSON.stringify(halfToy))).toBe('notBackup')
  })

  it('says so when the backup comes from a newer version of the app', async () => {
    const backup = await createBackup()

    expect(readProblem(JSON.stringify({ ...backup, version: backup.version + 1 }))).toBe(
      'newerVersion',
    )
  })
})

describe('backupFileName', () => {
  it('uses the local date, zero-padded', () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 30).getTime())).toBe('rastboden-2026-01-05.json')
  })
})
