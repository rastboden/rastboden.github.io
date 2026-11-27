import { beforeEach, describe, expect, it } from 'vitest'
import { archiveChild, createChild, listChildren } from './children'
import {
  lendToy,
  listActiveLoanDetails,
  listActiveLoans,
  listLoansForChild,
  returnLoan,
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
    await createToy({ name: 'Österbil', note: '' })
    await createToy({ name: 'Boll', note: '' })
    const archived = await createToy({ name: 'Trasig docka', note: '' })
    await archiveToy(archived.id)

    const names = (await listToys()).map((toy) => toy.name)

    expect(names).toEqual(['Boll', 'Österbil'])
  })

  it('stores, replaces and removes the image alongside the toy', async () => {
    const first = new Blob(['first'], { type: 'image/jpeg' })
    const second = new Blob(['second!'], { type: 'image/jpeg' })
    const input = { name: 'Boll', note: '' }

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

  it('lends the same toy to several children at once, and to one child twice', async () => {
    await lendToy(loanFor('toy-1', 'child-1'), 1000)
    await lendToy(loanFor('toy-1', 'child-2'), 2000)
    await lendToy(loanFor('toy-1', 'child-2'), 3000)

    const active = await listActiveLoans()

    expect(active.map((loan) => [loan.toyId, loan.childId])).toEqual([
      ['toy-1', 'child-1'],
      ['toy-1', 'child-2'],
      ['toy-1', 'child-2'],
    ])
  })

  it('returns one loan without touching the other loans of the same toy', async () => {
    const first = await lendToy(loanFor('toy-1', 'child-1'), 1000)
    const second = await lendToy(loanFor('toy-1', 'child-2'), 2000)

    await returnLoan(first.id, 3000)

    expect((await listActiveLoans()).map((loan) => loan.id)).toEqual([second.id])
    expect(await db.loans.get(first.id)).toMatchObject({ lentAt: 1000, returnedAt: 3000 })
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

  it('can undo a return even when the toy has been lent to someone else since', async () => {
    const loan = await lendToy(loanFor('toy-1', 'child-1'), 1000)
    await returnLoan(loan.id, 2000)
    const later = await lendToy(loanFor('toy-1', 'child-2'), 3000)

    await undoReturn(loan.id)

    expect((await listActiveLoans()).map((active) => active.id)).toEqual([loan.id, later.id])
  })

  it("lists one child's loans, returned or not, newest first with the toy", async () => {
    const ball = await createToy({ name: 'Boll', note: '' })
    const rope = await createToy({ name: 'Hopprep', note: '' })
    const first = await lendToy(loanFor(ball.id, 'child-1'), 1000)
    await returnLoan(first.id, 2000)
    await lendToy(loanFor(rope.id, 'child-1'), 3000)
    await lendToy(loanFor(ball.id, 'child-2'), 4000)

    const loans = await listLoansForChild('child-1')

    expect(loans.map(({ loan, toy }) => [toy?.name, loan.lentAt, loan.returnedAt])).toEqual([
      ['Hopprep', 3000, null],
      ['Boll', 1000, 2000],
    ])
  })

  it('lists active loans with their toy and child, also after those are archived', async () => {
    const ball = await createToy({ name: 'Boll', note: '' })
    const anna = await createChild({ firstName: 'Anna', lastName: 'Ek', className: '2A' })
    await lendToy(loanFor(ball.id, anna.id))
    await archiveToy(ball.id)
    await archiveChild(anna.id)

    const [details] = await listActiveLoanDetails()

    expect(details.toy?.name).toBe('Boll')
    expect(details.child?.firstName).toBe('Anna')
  })
})
