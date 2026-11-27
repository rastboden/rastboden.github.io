import { beforeEach, describe, expect, it } from 'vitest'
import { archiveChild, createChild, listChildren } from './children'
import {
  lendToy,
  listActiveLoanDetails,
  listActiveLoans,
  listAvailableToys,
  returnLoan,
  ToyAlreadyLentError,
  undoReturn,
} from './loans'
import { db } from './schema'
import { archiveToy, createToy, listToys, updateToy } from './toys'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('toys', () => {
  it('lists toys by name and hides archived ones', async () => {
    await createToy({ name: 'Österbil', category: '', note: '' })
    await createToy({ name: 'Boll', category: 'Ute', note: '' })
    const archived = await createToy({ name: 'Trasig docka', category: '', note: '' })
    await archiveToy(archived.id)

    const names = (await listToys()).map((toy) => toy.name)

    expect(names).toEqual(['Boll', 'Österbil'])
  })

  it('stores, replaces and removes the image alongside the toy', async () => {
    const first = new Blob(['first'], { type: 'image/jpeg' })
    const second = new Blob(['second!'], { type: 'image/jpeg' })
    const input = { name: 'Boll', category: '', note: '' }

    const toy = await createToy(input, { kind: 'replace', blob: first })
    expect((await db.toyImages.get(toy.id))?.blob.size).toBe(first.size)

    await updateToy(toy.id, input, { kind: 'unchanged' })
    expect((await db.toyImages.get(toy.id))?.blob.size).toBe(first.size)

    await updateToy(toy.id, input, { kind: 'replace', blob: second })
    expect((await db.toyImages.get(toy.id))?.blob.size).toBe(second.size)

    await updateToy(toy.id, input, { kind: 'remove' })
    expect(await db.toyImages.get(toy.id)).toBeUndefined()
  })
})

describe('children', () => {
  it('lists children by class then name and hides archived ones', async () => {
    await createChild({ firstName: 'Zoe', lastName: '', className: '2A' })
    await createChild({ firstName: 'Adam', lastName: '', className: '10B' })
    await createChild({ firstName: 'Åsa', lastName: '', className: '2A' })
    const moved = await createChild({ firstName: 'Bo', lastName: '', className: '2A' })
    await archiveChild(moved.id)

    const names = (await listChildren()).map((child) => `${child.className} ${child.firstName}`)

    expect(names).toEqual(['2A Zoe', '2A Åsa', '10B Adam'])
  })
})

describe('loans', () => {
  const loanFor = (toyId: string, childId: string) => ({ toyId, childId, dueAt: null, note: '' })

  it('refuses to lend a toy that is already out', async () => {
    await lendToy(loanFor('toy-1', 'child-1'))

    await expect(lendToy(loanFor('toy-1', 'child-2'))).rejects.toBeInstanceOf(ToyAlreadyLentError)
  })

  it('keeps the loan as history when the toy is returned, and frees the toy', async () => {
    const loan = await lendToy(loanFor('toy-1', 'child-1'), 1000)

    await returnLoan(loan.id, 2000)

    expect(await listActiveLoans()).toEqual([])
    expect(await db.loans.get(loan.id)).toMatchObject({ lentAt: 1000, returnedAt: 2000 })
    await expect(lendToy(loanFor('toy-1', 'child-2'))).resolves.toBeDefined()
  })

  it('keeps the first return time if a loan is returned twice', async () => {
    const loan = await lendToy(loanFor('toy-1', 'child-1'), 1000)

    await returnLoan(loan.id, 2000)
    await returnLoan(loan.id, 3000)

    expect((await db.loans.get(loan.id))?.returnedAt).toBe(2000)
  })

  it('puts a loan back as active when the return is undone', async () => {
    const loan = await lendToy(loanFor('toy-1', 'child-1'), 1000)
    await returnLoan(loan.id, 2000)

    await undoReturn(loan.id)

    expect((await listActiveLoans()).map((active) => active.id)).toEqual([loan.id])
  })

  it('refuses to undo a return once the toy has been lent to someone else', async () => {
    const loan = await lendToy(loanFor('toy-1', 'child-1'), 1000)
    await returnLoan(loan.id, 2000)
    await lendToy(loanFor('toy-1', 'child-2'), 3000)

    await expect(undoReturn(loan.id)).rejects.toBeInstanceOf(ToyAlreadyLentError)
  })

  it('offers only toys that are not out on loan', async () => {
    const ball = await createToy({ name: 'Boll', category: '', note: '' })
    const rope = await createToy({ name: 'Hopprep', category: '', note: '' })
    const loan = await lendToy(loanFor(ball.id, 'child-1'))

    expect((await listAvailableToys()).map((toy) => toy.name)).toEqual(['Hopprep'])

    await returnLoan(loan.id)

    expect((await listAvailableToys()).map((toy) => toy.name)).toEqual(['Boll', rope.name])
  })

  it('lists active loans with their toy and child, also after those are archived', async () => {
    const ball = await createToy({ name: 'Boll', category: '', note: '' })
    const anna = await createChild({ firstName: 'Anna', lastName: 'Ek', className: '2A' })
    await lendToy(loanFor(ball.id, anna.id))
    await archiveToy(ball.id)
    await archiveChild(anna.id)

    const [details] = await listActiveLoanDetails()

    expect(details.toy?.name).toBe('Boll')
    expect(details.child?.firstName).toBe('Anna')
  })
})
