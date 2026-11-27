import { beforeEach, describe, expect, it } from 'vitest'
import { archiveChild, createChild, listChildren } from './children'
import {
  lendToys,
  listActiveLoanDetails,
  listActiveLoans,
  listLoanLinesForChild,
  outstandingLines,
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
  /** One of one toy, which is what most loans are. */
  const one = (toyId: string, childId: string) => ({ childId, lines: [{ toyId, quantity: 1 }] })
  /** Three ropes and a ball for one child. */
  const ropesAndBall = (ropeId = 'rope', ballId = 'ball') => ({
    childId: 'child-1',
    lines: [
      { toyId: ropeId, quantity: 3 },
      { toyId: ballId, quantity: 1 },
    ],
  })
  const itemsOf = async (loanId: string) => (await db.loans.get(loanId))?.items

  it('lends several toys, and several of one toy, as a single loan', async () => {
    const loan = await lendToys(ropesAndBall(), 1000)

    expect(await db.loans.count()).toBe(1)
    expect(await db.loans.get(loan.id)).toEqual({
      id: loan.id,
      childId: 'child-1',
      lentAt: 1000,
      items: [
        { toyId: 'rope', quantity: 3, returnedAt: null },
        { toyId: 'ball', quantity: 1, returnedAt: null },
      ],
    })
  })

  it('leaves out lines with nothing on them and refuses an empty loan', async () => {
    const loan = await lendToys({
      childId: 'child-1',
      lines: [
        { toyId: 'rope', quantity: 0 },
        { toyId: 'ball', quantity: 2 },
      ],
    })

    expect(loan.items.map((item) => item.toyId)).toEqual(['ball'])
    await expect(lendToys({ childId: 'child-1', lines: [] })).rejects.toThrow()
    await expect(
      lendToys({ childId: 'child-1', lines: [{ toyId: 'rope', quantity: 0 }] }),
    ).rejects.toThrow()
  })

  it('lends the same toy to several children at once, and to one child twice', async () => {
    await lendToys(one('toy-1', 'child-1'), 1000)
    await lendToys(one('toy-1', 'child-2'), 2000)
    await lendToys(one('toy-1', 'child-2'), 3000)

    const active = await listActiveLoans()

    expect(active.map((loan) => loan.childId)).toEqual(['child-1', 'child-2', 'child-2'])
  })

  it('returns one loan without touching the other loans of the same toy', async () => {
    const first = await lendToys(one('toy-1', 'child-1'), 1000)
    const second = await lendToys(one('toy-1', 'child-2'), 2000)

    await returnLoan(first.id, 3000)

    expect((await listActiveLoans()).map((loan) => loan.id)).toEqual([second.id])
    expect(await db.loans.get(first.id)).toMatchObject({
      lentAt: 1000,
      items: [{ toyId: 'toy-1', quantity: 1, returnedAt: 3000 }],
    })
  })

  it('keeps the first return time if a loan is returned twice', async () => {
    const loan = await lendToys(one('toy-1', 'child-1'), 1000)

    await returnLoan(loan.id, 2000)
    await returnLoan(loan.id, 3000)

    expect(await itemsOf(loan.id)).toEqual([{ toyId: 'toy-1', quantity: 1, returnedAt: 2000 }])
  })

  it('returns some of a loan and keeps the rest out', async () => {
    const loan = await lendToys(ropesAndBall(), 1000)

    await returnLoan(loan.id, 2000, [{ toyId: 'rope', quantity: 2 }])

    expect(await itemsOf(loan.id)).toEqual([
      { toyId: 'rope', quantity: 2, returnedAt: 2000 },
      { toyId: 'rope', quantity: 1, returnedAt: null },
      { toyId: 'ball', quantity: 1, returnedAt: null },
    ])
    const [active] = await listActiveLoans()
    expect(outstandingLines(active)).toEqual([
      { toyId: 'rope', quantity: 1 },
      { toyId: 'ball', quantity: 1 },
    ])
  })

  it('never returns more of a toy than is out', async () => {
    const loan = await lendToys(ropesAndBall(), 1000)

    await returnLoan(loan.id, 2000, [
      { toyId: 'rope', quantity: 5 },
      { toyId: 'not-on-the-loan', quantity: 1 },
    ])

    expect(await itemsOf(loan.id)).toEqual([
      { toyId: 'rope', quantity: 3, returnedAt: 2000 },
      { toyId: 'ball', quantity: 1, returnedAt: null },
    ])
  })

  it('is no longer active once the last part has come back', async () => {
    const loan = await lendToys(ropesAndBall(), 1000)

    await returnLoan(loan.id, 2000, [{ toyId: 'rope', quantity: 2 }])
    expect(await listActiveLoans()).toHaveLength(1)

    await returnLoan(loan.id, 3000)

    expect(await listActiveLoans()).toEqual([])
    expect(await itemsOf(loan.id)).toEqual([
      { toyId: 'rope', quantity: 2, returnedAt: 2000 },
      { toyId: 'rope', quantity: 1, returnedAt: 3000 },
      { toyId: 'ball', quantity: 1, returnedAt: 3000 },
    ])
  })

  it('puts a loan back as active when the return is undone', async () => {
    const loan = await lendToys(one('toy-1', 'child-1'), 1000)
    await returnLoan(loan.id, 2000)

    await undoReturn(loan.id, 2000)

    expect((await listActiveLoans()).map((active) => active.id)).toEqual([loan.id])
  })

  it('undoes only the latest return, and joins what is out into one item again', async () => {
    const loan = await lendToys(ropesAndBall(), 1000)
    await returnLoan(loan.id, 2000, [{ toyId: 'rope', quantity: 1 }])
    await returnLoan(loan.id, 3000, [{ toyId: 'rope', quantity: 1 }])

    await undoReturn(loan.id, 3000)

    expect(await itemsOf(loan.id)).toEqual([
      { toyId: 'rope', quantity: 1, returnedAt: 2000 },
      { toyId: 'rope', quantity: 2, returnedAt: null },
      { toyId: 'ball', quantity: 1, returnedAt: null },
    ])
  })

  it('can undo a return even when the toy has been lent to someone else since', async () => {
    const loan = await lendToys(one('toy-1', 'child-1'), 1000)
    await returnLoan(loan.id, 2000)
    const later = await lendToys(one('toy-1', 'child-2'), 3000)

    await undoReturn(loan.id, 2000)

    expect((await listActiveLoans()).map((active) => active.id)).toEqual([loan.id, later.id])
  })

  it('lists what one child has borrowed, returned or not, newest loan first with the toy', async () => {
    const ball = await createToy({ name: 'Boll', note: '' })
    const rope = await createToy({ name: 'Hopprep', note: '' })
    const first = await lendToys(one(ball.id, 'child-1'), 1000)
    await returnLoan(first.id, 2000)
    const second = await lendToys(ropesAndBall(rope.id, ball.id), 3000)
    await returnLoan(second.id, 3500, [{ toyId: rope.id, quantity: 2 }])
    await lendToys(one(ball.id, 'child-2'), 4000)

    const lines = await listLoanLinesForChild('child-1')

    expect(
      lines.map((line) => [line.toy?.name, line.quantity, line.lentAt, line.returnedAt]),
    ).toEqual([
      ['Hopprep', 2, 3000, 3500],
      ['Hopprep', 1, 3000, null],
      ['Boll', 1, 3000, null],
      ['Boll', 1, 1000, 2000],
    ])
  })

  it('lists active loans with the child and what is still out, also after those are archived', async () => {
    const ball = await createToy({ name: 'Boll', note: '' })
    const rope = await createToy({ name: 'Hopprep', note: '' })
    const anna = await createChild({ firstName: 'Anna', lastName: 'Ek', className: '2A' })
    const loan = await lendToys({
      childId: anna.id,
      lines: [
        { toyId: ball.id, quantity: 2 },
        { toyId: rope.id, quantity: 1 },
      ],
    })
    await returnLoan(loan.id, Date.now(), [{ toyId: rope.id, quantity: 1 }])
    await archiveToy(ball.id)
    await archiveChild(anna.id)

    const [details] = await listActiveLoanDetails()

    expect(details.child?.firstName).toBe('Anna')
    expect(details.outstanding.map((line) => [line.toy?.name, line.quantity])).toEqual([['Boll', 2]])
  })
})
